import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Columns2, Grid3x3, RefreshCw, Search, X } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkGrid } from '../components/artwork/ArtworkGrid';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { ArtworkGridSkeleton } from '../components/ui/Skeletons';
import type { ArtworkCategory } from '../types/artverse';
import lapisArtwork from '../assets/images/art_lapis_refraction_1792993241626.jpg';

const CATEGORIES: { value: 'all' | ArtworkCategory; label: string }[] = [
  { value: 'all', label: 'All Works' },
  { value: 'painting', label: 'Painting' },
  { value: 'photography', label: 'Photography' },
  { value: 'sculpture', label: 'Sculpture' },
  { value: 'drawing', label: 'Drawing' },
  { value: 'digital_art', label: 'Digital Art' },
];

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export const GalleryPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    artworks,
    getProfileById,
    savedArtworkIds,
    isLoadingCatalog,
    catalogError,
    refreshCatalog,
  } = useArtVerse();

  const initialCat =
    (searchParams.get('category') as ArtworkCategory | null) || 'all';
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | ArtworkCategory
  >(CATEGORIES.some((c) => c.value === initialCat) ? initialCat : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [savedOnly, setSavedOnly] = useState(false);
  const [gridDensity, setGridDensity] = useState<'standard' | 'salon'>(
    'standard'
  );

  const handleCategoryChange = (cat: 'all' | ArtworkCategory) => {
    setSelectedCategory(cat);
    if (cat === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const list = artworks.filter((art) => {
      if (selectedCategory !== 'all' && art.category !== selectedCategory) {
        return false;
      }
      if (savedOnly && !savedArtworkIds.includes(art.id)) {
        return false;
      }
      if (!query) return true;

      const artistName =
        getProfileById(art.artistId)?.fullName.toLowerCase() || '';
      return (
        art.title.toLowerCase().includes(query) ||
        art.medium.toLowerCase().includes(query) ||
        artistName.includes(query)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'popular') return b.likesCount - a.likesCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    artworks,
    getProfileById,
    savedArtworkIds,
    savedOnly,
    searchQuery,
    selectedCategory,
    sortBy,
  ]);

  const resetFilters = () => {
    handleCategoryChange('all');
    setSearchQuery('');
    setSavedOnly(false);
    setSortBy('newest');
  };

  return (
    <div className="w-full relative isolate min-h-screen">
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url("${lapisArtwork}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity: 0.12,
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(250, 248, 243, 0.85) 0%, rgba(247, 243, 237, 0.9) 100%)',
        }}
      />
      <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-8 sm:py-12 lg:py-16">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-2xl mb-8 sm:mb-10"
        >
          <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
            Exhibition Catalogue
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#141312] mt-1">
            Original Artworks & Editions
          </h1>
          <p className="text-sm sm:text-base text-[#575048] mt-3 leading-relaxed">
            Explore works available for direct studio acquisition or private
            collector offer negotiation.
          </p>
        </motion.div>

        {/* Filter & Search Toolbar */}
        <div className="space-y-4 pb-6 sm:pb-8 border-b border-[#E6DFD3]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4 min-w-0">
            {/* Animated Segmented Category Bar (horizontally touch-scrollable on mobile) */}
            <div
              role="group"
              aria-label="Filter artworks by medium category"
              className="flex items-center gap-1 p-1.5 bg-[#EFEAE0] rounded-xl w-full xl:w-auto max-w-full overflow-x-auto no-scrollbar"
            >
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`relative px-3.5 sm:px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'text-[#141312]'
                        : 'text-[#575048] hover:text-[#141312]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={
                          shouldReduceMotion
                            ? undefined
                            : 'gallery-category-active-bg'
                        }
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 32,
                        }}
                        className="absolute inset-0 bg-white rounded-lg shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search + Sort + Saved + Density */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto">
              <div className="relative col-span-2 sm:flex-1 sm:w-64 min-w-0">
                <Search className="w-4 h-4 text-[#787066] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search artworks by title, medium, or artist"
                  placeholder="Search title or artist..."
                  className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-white border border-[#DED6C6] rounded-xl text-sm text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#787066] hover:text-[#141312]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <motion.button
                type="button"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                onClick={() => setSavedOnly((prev) => !prev)}
                aria-pressed={savedOnly}
                className={`px-3.5 py-2.5 sm:py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 text-center ${
                  savedOnly
                    ? 'bg-[#141312] text-[#FAF8F3] border-[#141312]'
                    : 'bg-white text-[#3B352F] border-[#DED6C6] hover:border-[#B38B40]'
                }`}
              >
                Saved ({savedArtworkIds.length})
              </motion.button>

              <label className="sr-only" htmlFor="gallery-sort-select">
                Sort artworks
              </label>
              <select
                id="gallery-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 sm:px-3.5 py-2.5 sm:py-2 bg-white border border-[#DED6C6] rounded-xl text-xs font-medium text-[#141312] focus:outline-none focus:border-[#B38B40] min-w-0 truncate"
              >
                <option value="newest">Sort: Newest Listed</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Popularity</option>
              </select>

              {/* Salon Layout Scale Toggle */}
              <div
                role="group"
                aria-label="Gallery layout scale"
                className="hidden lg:flex items-center p-1 bg-[#EFEAE0] rounded-xl"
              >
                <button
                  type="button"
                  onClick={() => setGridDensity('standard')}
                  aria-label="Three-column catalogue grid"
                  className={`p-1.5 rounded-lg transition-colors ${
                    gridDensity === 'standard'
                      ? 'bg-white text-[#141312] shadow-xs'
                      : 'text-[#787066] hover:text-[#141312]'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGridDensity('salon')}
                  aria-label="Two-column large salon plates"
                  className={`p-1.5 rounded-lg transition-colors ${
                    gridDensity === 'salon'
                      ? 'bg-white text-[#141312] shadow-xs'
                      : 'text-[#787066] hover:text-[#141312]'
                  }`}
                >
                  <Columns2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B655E]">
            <div className="flex items-center gap-3">
              <p className="tabular-nums">
                {isLoadingCatalog
                  ? 'Synchronizing exhibition catalogue...'
                  : `Showing ${filteredArtworks.length} of ${artworks.length} works`}
              </p>
              <button
                type="button"
                disabled={isLoadingCatalog}
                onClick={refreshCatalog}
                className="inline-flex items-center gap-1 text-[#787066] hover:text-[#141312] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoadingCatalog ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>
            {(selectedCategory !== 'all' || searchQuery || savedOnly) && (
              <button
                type="button"
                onClick={resetFilters}
                className="font-medium text-[#9E7B3B] hover:text-[#141312] transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Animated Layout Reflow Gallery Grid with Skeleton State */}
        <AnimatePresence mode="wait">
          {isLoadingCatalog ? (
            <div key="gallery-skeleton" className="pt-10">
              <ArtworkGridSkeleton
                count={gridDensity === 'salon' ? 4 : 6}
                columnsClass={
                  gridDensity === 'salon'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-9'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7'
                }
                aspectClass={
                  gridDensity === 'salon' ? 'aspect-[4/3]' : 'aspect-[4/5]'
                }
              />
            </div>
          ) : catalogError ? (
            <div role="alert" className="py-20 text-center max-w-md mx-auto space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-[#141312]">
                Catalogue could not be loaded
              </h2>
              <p className="text-sm text-[#575048]">{catalogError}</p>
              <button
                type="button"
                onClick={() => void refreshCatalog()}
                className="px-5 py-2.5 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#292623] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredArtworks.length === 0 ? (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 text-center max-w-md mx-auto space-y-4"
          >
            <h2 className="font-serif text-2xl font-semibold text-[#141312]">
              {artworks.length === 0
                ? 'No artworks have been published yet'
                : 'No matching works in this view'}
            </h2>
            <p className="text-sm text-[#575048]">
              {artworks.length === 0
                ? 'Check back soon to discover new work from ARTIVORA artists.'
                : 'Try adjusting your search query, category filter, or saved shortlist selection to explore more works in the catalogue.'}
            </p>
            {artworks.length > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#292623] transition-colors"
              >
                Show All Works
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout={!shouldReduceMotion}
            className={`pt-10`}
          >
            <ArtworkGrid>
              <AnimatePresence mode="popLayout">
                {filteredArtworks.map((art, index) => (
                  <motion.div
                    key={art.id}
                    layout={!shouldReduceMotion}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: 20, scale: 0.96 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.95 }
                    }
                    transition={{
                      duration: 0.3,
                      delay: shouldReduceMotion ? 0 : Math.min(index * 0.04, 0.2),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <ArtworkCard
                      artwork={art}
                      aspectClass={
                        gridDensity === 'salon' ? 'aspect-[4/3]' : 'aspect-[4/5]'
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </ArtworkGrid>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
