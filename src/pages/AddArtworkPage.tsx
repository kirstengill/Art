import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Eye, Upload, X } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, STUDIO_PRESET_OPTIONS } from '../data/artworkImages';
import type {
  ArtworkCategory,
  AvailabilityStatus,
  SaleMode,
} from '../types/artverse';
import {
  formatAvailabilityLabel,
  formatCategoryLabel,
  formatMoney,
  formatSaleModeLabel,
} from '../utils/formatters';

interface ValidationErrors {
  title?: string;
  description?: string;
  medium?: string;
  dimensions?: string;
  year?: string;
  price?: string;
  imageKey?: string;
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const AddArtworkPage: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const {
    getArtworkById,
    publishOrUpdateArtwork,
    authMode,
    currentUser,
  } = useArtVerse();

  const existingArtwork = editId ? getArtworkById(editId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ArtworkCategory>('painting');
  const [medium, setMedium] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [price, setPrice] = useState<string>('4800');
  const [currency, setCurrency] = useState<string>('USD');
  const [availability, setAvailability] =
    useState<AvailabilityStatus>('available');
  const [saleMode, setSaleMode] = useState<SaleMode>(
    'buy_now_and_negotiation'
  );
  const [imageKey, setImageKey] = useState<string>('hero_gilded_horizon');
  const [provenance, setProvenance] = useState<string>(
    'Direct from the artist studio; signed Certificate of Authenticity included.'
  );
  const [editionInfo, setEditionInfo] = useState<string>(
    'Unique 1 of 1 original work'
  );

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (existingArtwork) {
      setTitle(existingArtwork.title);
      setDescription(existingArtwork.description);
      setCategory(existingArtwork.category);
      setMedium(existingArtwork.medium);
      setDimensions(existingArtwork.dimensions);
      setYear(String(existingArtwork.year));
      setPrice(String(existingArtwork.price));
      setCurrency(existingArtwork.currency);
      setAvailability(existingArtwork.availability);
      setSaleMode(existingArtwork.saleMode);
      setImageKey(existingArtwork.imageKey);
      setProvenance(existingArtwork.provenance);
      setEditionInfo(existingArtwork.editionInfo);
    }
  }, [existingArtwork]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        imageKey: 'Please upload a valid JPEG, PNG, or WebP image file.',
      }));
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        imageKey: 'Image file must be under 4.5 MB.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageKey(reader.result);
        setErrors((prev) => ({ ...prev, imageKey: undefined }));
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = (): boolean => {
    const next: ValidationErrors = {};
    if (title.trim().length < 2) {
      next.title = 'Artwork title is required (at least 2 characters).';
    }
    if (description.trim().length < 20) {
      next.description =
        'Provide a curatorial description of at least 20 characters.';
    }
    if (!medium.trim()) {
      next.medium = 'Specify the medium and support (e.g., Oil on linen).';
    }
    if (!dimensions.trim()) {
      next.dimensions = 'Enter physical dimensions (e.g., 100 × 80 cm).';
    }
    const parsedYear = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(parsedYear) || parsedYear < 1850 || parsedYear > maxYear) {
      next.year = `Enter a valid creation year between 1850 and ${maxYear}.`;
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 50) {
      next.price = 'Enter a valid listing price of at least 50.';
    }
    if (!imageKey) {
      next.imageKey = 'Select or upload an artwork photograph.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleOpenPreview = () => {
    if (validate()) {
      setPreviewModalOpen(true);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitError(null);
    setSaving(true);
    try {
      const saved = await publishOrUpdateArtwork({
        id: existingArtwork?.id,
        title,
        description,
        category,
        medium,
        dimensions,
        year: Number(year),
        price: Math.round(Number(price)),
        currency,
        availability,
        saleMode,
        imageKey,
        provenance,
        editionInfo,
      });
      navigate(`/artwork/${saved.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to publish artwork.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-8 sm:py-10 lg:py-14">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#5C554C] hover:text-[#141312] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Artist Studio Dashboard
        </Link>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E6DFD3]"
        >
          <div>
            <p className="text-xs font-medium tracking-wide text-[#8C6828]">
              Catalogue Submission
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] mt-1 text-balance">
              {existingArtwork ? 'Edit Artwork Listing' : 'Publish Original Artwork'}
            </h1>
          </div>
          <p className="text-xs text-[#6B655E]">
            {authMode === 'authenticated'
              ? `Publishing to permanent catalogue as ${currentUser?.fullName}`
              : 'Demo Mode: Listing is stored in current session state'}
          </p>
        </motion.div>

        <form
          onSubmit={handlePublish}
          noValidate
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10 items-start"
        >
          {/* Left Form Fields */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: 0.04, ease: EASE_OUT }}
            className="lg:col-span-7 space-y-6 bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-8 shadow-2xs"
          >
            {/* Image Upload & Studio Presets */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[#3B352F]">
                Artwork Plate Photograph *
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#2A2724] cursor-pointer transition-colors whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Image File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
                <span className="text-xs text-[#7A7267]">
                  or select a studio archival plate preset:
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {STUDIO_PRESET_OPTIONS.map((preset) => {
                  const active = imageKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setImageKey(preset.key)}
                      className={`relative px-3 py-2 text-left text-xs rounded-xl border transition-colors truncate ${
                        active
                          ? 'bg-[#F5EFE2] border-[#B38B40] text-[#141312] font-medium'
                          : 'bg-[#FAF8F3] border-[#E6DFD3] text-[#5C554C] hover:border-[#CBBFA8]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              {errors.imageKey && (
                <p role="alert" className="text-xs text-[#992E24]">
                  {errors.imageKey}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="artwork-title"
                className="block text-xs font-medium text-[#3B352F]"
              >
                Artwork Title *
              </label>
              <input
                id="artwork-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Study in Raw Umber VII"
                className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
              />
              {errors.title && (
                <p role="alert" className="text-xs text-[#992E24]">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="artwork-description"
                className="block text-xs font-medium text-[#3B352F]"
              >
                Curatorial Description & Process Notes *
              </label>
              <textarea
                id="artwork-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe materials, surface texture, framing, and conceptual context..."
                className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
              />
              {errors.description && (
                <p role="alert" className="text-xs text-[#992E24]">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Category & Medium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-category"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Category *
                </label>
                <select
                  id="artwork-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ArtworkCategory)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                >
                  <option value="painting">Painting</option>
                  <option value="photography">Photography</option>
                  <option value="sculpture">Sculpture</option>
                  <option value="drawing">Drawing</option>
                  <option value="digital_art">Digital Art</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-medium"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Medium & Support *
                </label>
                <input
                  id="artwork-medium"
                  type="text"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  placeholder="e.g., Oil and cold wax on linen"
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                />
                {errors.medium && (
                  <p role="alert" className="text-xs text-[#992E24]">
                    {errors.medium}
                  </p>
                )}
              </div>
            </div>

            {/* Dimensions & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-dimensions"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Dimensions *
                </label>
                <input
                  id="artwork-dimensions"
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g., 120 × 95 cm"
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                />
                {errors.dimensions && (
                  <p role="alert" className="text-xs text-[#992E24]">
                    {errors.dimensions}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-year"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Creation Year *
                </label>
                <input
                  id="artwork-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl font-mono text-sm text-[#141312] tabular-nums focus:outline-none focus:border-[#B38B40] transition-colors"
                />
                {errors.year && (
                  <p role="alert" className="text-xs text-[#992E24]">
                    {errors.year}
                  </p>
                )}
              </div>
            </div>

            {/* Price, Currency & Availability */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-price"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Listed Price *
                </label>
                <input
                  id="artwork-price"
                  type="number"
                  min={50}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl font-mono text-sm text-[#141312] tabular-nums focus:outline-none focus:border-[#B38B40] transition-colors"
                />
                {errors.price && (
                  <p role="alert" className="text-xs text-[#992E24]">
                    {errors.price}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-currency"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Currency
                </label>
                <select
                  id="artwork-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl font-mono text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="artwork-availability"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Availability
                </label>
                <select
                  id="artwork-availability"
                  value={availability}
                  onChange={(e) =>
                    setAvailability(e.target.value as AvailabilityStatus)
                  }
                  className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold / Acquired</option>
                </select>
              </div>
            </div>

            {/* Sale Mode Selection */}
            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#3B352F]">
                Collector Acquisition Mode *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    value: 'buy_now' as const,
                    title: 'Buy Now',
                    desc: 'Fixed gallery price only',
                  },
                  {
                    value: 'negotiation_only' as const,
                    title: 'Negotiation Only',
                    desc: 'Private collector offers',
                  },
                  {
                    value: 'buy_now_and_negotiation' as const,
                    title: 'Buy Now + Offer',
                    desc: 'Direct purchase or offer',
                  },
                ].map((opt) => {
                  const active = saleMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSaleMode(opt.value)}
                      className={`relative p-3.5 rounded-xl border text-left transition-colors ${
                        active
                          ? 'bg-[#F5EFE2] border-[#B38B40] text-[#141312]'
                          : 'bg-[#FAF8F3] border-[#E6DFD3] text-[#5C554C] hover:border-[#CBBFA8]'
                      }`}
                    >
                      <p className="text-xs font-semibold text-[#141312]">
                        {opt.title}
                      </p>
                      <p className="text-[11px] text-[#6B655E] mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <p role="alert" className="text-xs font-medium text-[#992E24]">
                {submitError}
              </p>
            )}

            <div className="pt-4 border-t border-[#ECE6DA] flex flex-wrap items-center justify-between gap-3">
              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={handleOpenPreview}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#F3EFE6] text-[#141312] rounded-xl hover:bg-[#E7E0D2] transition-colors whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview Before Publishing
              </motion.button>

              <motion.button
                type="submit"
                disabled={saving}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="px-6 py-2.5 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {saving
                  ? 'Saving Listing...'
                  : existingArtwork
                  ? 'Save Listing Updates'
                  : 'Publish Artwork to Gallery'}
              </motion.button>
            </div>
          </motion.div>

          {/* Right Live Catalogue Card Preview */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <p className="text-xs font-medium tracking-wide text-[#8C6828]">
              Live Catalogue Card Preview
            </p>
            <div className="bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-2xs">
              <div className="aspect-[4/5] bg-[#EFEAE0] overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={imageKey}
                    initial={
                      shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.03 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="w-full h-full"
                  >
                    <ArtworkImage
                      imageKey={imageKey}
                      alt={title || 'Untitled Artwork Preview'}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-[#7A7267] tabular-nums">
                  <span>{formatCategoryLabel(category)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{year || '2026'}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#141312]">
                  {title.trim() || 'Untitled Studio Work'}
                </h2>
                <p className="text-xs text-[#6B655E]">
                  {medium.trim() || 'Medium & support'} ·{' '}
                  {dimensions.trim() || 'Dimensions'}
                </p>
                <div className="pt-3 border-t border-[#ECE6DA] flex items-baseline justify-between gap-2">
                  <span className="font-mono text-lg font-medium text-[#141312] tabular-nums">
                    {formatMoney(Number(price) || 0, currency)} {currency}
                  </span>
                  <span className="text-xs text-[#6B655E]">
                    {formatAvailabilityLabel(availability)} ·{' '}
                    {formatSaleModeLabel(saleMode)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </form>
      </div>

      {/* Full Exhibition Modal Preview */}
      <AnimatePresence>
        {previewModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Exhibition listing preview"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-[#141312]/65 backdrop-blur-[2px]"
          >
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.96, y: 8 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[88dvh] flex flex-col bg-[#FAF8F3] border border-[#DFD8CA] rounded-2xl overflow-hidden shadow-xl my-auto"
            >
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E6DFD3] shrink-0">
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#141312]">
                  Pre-Publication Viewing Room Preview
                </h2>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  aria-label="Close preview"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5C554C] hover:bg-[#EFEAE0] shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll">
                <div className="aspect-[4/5] rounded-xl overflow-hidden border border-[#E6DFD3]">
                  <ArtworkImage imageKey={imageKey} alt={title} />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-[#7A7267] tabular-nums">
                      {formatCategoryLabel(category)} · {year}
                    </p>
                    <h3 className="font-serif text-2xl font-semibold text-[#141312] mt-1">
                      {title}
                    </h3>
                    <p className="text-xs text-[#5C554C] mt-1">
                      {medium} · {dimensions}
                    </p>
                  </div>
                  <p className="text-sm text-[#4F4840] leading-relaxed">
                    {description}
                  </p>
                  <div className="pt-3 border-t border-[#E6DFD3]">
                    <p className="font-mono text-xl font-medium text-[#141312] tabular-nums">
                      {formatMoney(Number(price) || 0, currency)} {currency}
                    </p>
                    <p className="text-xs text-[#6B655E]">
                      {formatAvailabilityLabel(availability)} ·{' '}
                      {formatSaleModeLabel(saleMode)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 sm:px-6 py-4 bg-[#F3EFE6] border-t border-[#E6DFD3] flex flex-wrap justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#3B352F] hover:bg-[#E7E0D2] rounded-xl transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    setPreviewModalOpen(false);
                    handlePublish(e as unknown as React.FormEvent);
                  }}
                  className="px-5 py-2 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] transition-colors"
                >
                  Confirm & Publish Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
