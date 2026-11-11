import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useArtVerse } from '../context/ArtVerseContext';
import { formatShortDate } from '../utils/formatters';
import { Plus, Calendar, Pin, Image } from 'lucide-react';
import type { Artwork } from '../types/artverse';
import type { Exhibition } from '../types/artverse';
import { resolveArtworkImageUrl } from '../data/artworkImages';

export function ExhibitionPage() {
  const {
    exhibitions,
    fetchExhibitions,
    fetchExhibitionArtworks,
    createExhibition,
    updateExhibition,
    deleteExhibition,
    exhibitionError,
    currentUser,
    isAuthLoading,
  } = useArtVerse();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'active' | 'archived' | 'cancelled'>('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    isVirtual: false,
    virtualUrl: '',
    featured: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [exhibitionArtworks, setExhibitionArtworks] = useState<Record<string, Artwork[]>>({});

  const canCurate = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'artist'));

  useEffect(() => {
    void fetchExhibitions(statusFilter === 'all' ? undefined : statusFilter);
  }, [fetchExhibitions, statusFilter]);

  useEffect(() => {
    const loadArtworks = async () => {
      for (const exhibition of exhibitions) {
        try {
          const artworks = await fetchExhibitionArtworks(exhibition.id);
          setExhibitionArtworks((prev) => ({ ...prev, [exhibition.id]: artworks }));
        } catch {
          // Silent - artwork loading failure shouldn't block exhibition listing
        }
      }
    };
    void loadArtworks();
  }, [exhibitions, fetchExhibitionArtworks]);

  const filtered = exhibitions.filter((e) => {
    if (statusFilter === 'all') return true;
    return e.status === statusFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createExhibition({
        title: draft.title,
        description: draft.description || undefined,
        startDate: draft.startDate,
        endDate: draft.endDate,
        location: draft.location || undefined,
        isVirtual: draft.isVirtual,
        virtualUrl: draft.virtualUrl || undefined,
        featured: draft.featured,
      });
      setOpenCreate(false);
      setDraft({ title: '', description: '', startDate: '', endDate: '', location: '', isVirtual: false, virtualUrl: '', featured: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this exhibition?')) return;
    try {
      await deleteExhibition(id);
    } catch {
      // error surfaced by context
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-12 text-center">
        <p className="text-[#5C554C]">Loading&hellip;</p>
      </div>
    );
  }

  const statusChips: { value: 'all' | 'draft' | 'scheduled' | 'active' | 'archived' | 'cancelled'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold">Exhibitions</h1>
          <p className="text-[#5C554C] mt-1">
            Curated presentations of Louvre Singa artworks across the gallery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCurate && (
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                color: '#141312',
              }}
            >
              <Plus className="h-4 w-4" /> New exhibition
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === chip.value
                ? 'border-[#B38B40] bg-[#B38B40]/10 text-[#5A4010]'
                : 'border-[#D4C5B0] text-[#5C554C] hover:border-[#B38B40] hover:text-[#B38B40]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {exhibitionError && (
        <div className="rounded-lg border border-red-900/30 bg-red-900/10 p-4 text-red-300 text-sm">
          {exhibitionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-12 text-center text-[#5C554C]">
            No exhibitions match these filters.
          </div>
        ) : (
          filtered.map((exhibition: Exhibition) => {
            const artworks = exhibitionArtworks[exhibition.id] || [];
            return (
              <div key={exhibition.id} className="rounded-xl border border-[#E2D6BD] bg-white p-5 flex flex-col">
                <div className="relative h-32 rounded-lg overflow-hidden border border-[#D4C5B0] bg-[#F5EFE2] mb-4">
                  {exhibition.coverImageKey ? (
                    <img
                      src={resolveArtworkImageUrl(exhibition.coverImageKey) || undefined}
                      alt={exhibition.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#C8C1B6] text-xs">
                      <Image className="h-6 w-6 mx-auto mb-1.5" /> No cover image
                    </div>
                  )}
                  {artworks.length > 0 && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {artworks.slice(0, 3).map((art) => (
                        <img
                          key={art.id}
                          src={resolveArtworkImageUrl(art.imageKey) || undefined}
                          alt={art.title}
                          className="h-8 w-8 rounded-md object-cover border border-white bg-white shadow-sm"
                        />
                      ))}
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium border"
                  style={{
                    borderColor: exhibition.status === 'active' ? '#2E7D32' : '#B38B40',
                    color: exhibition.status === 'active' ? '#2E7D32' : '#5A4010',
                    background: exhibition.status === 'active' ? '#E8F5E9' : '#FDF6EC',
                  }}
                >
                  {exhibition.status}
                </span>
                {exhibition.featured && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium border border-[#B38B40] bg-[#FDF6EC] text-[#5A4010]">
                    Featured
                  </span>
                )}
              </div>
              <h3 className="font-serif text-lg font-semibold truncate">{exhibition.title}</h3>
              <p className="text-sm text-[#5C554C] line-clamp-2 mb-3">{exhibition.description}</p>
              <div className="flex items-center gap-2 text-xs text-[#5C554C] mb-auto">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatShortDate(exhibition.startDate)} &mdash; {formatShortDate(exhibition.endDate)}</span>
              </div>
              {exhibition.location && (
                <div className="flex items-center gap-1 text-xs text-[#5C554C] mb-3">
                  <Pin className="h-3.5 w-3.5" />
                  <span className="truncate">{exhibition.location}</span>
                </div>
              )}
              <div className="mt-auto pt-3 border-t border-[#E2D6BD] flex justify-between items-center">
                {canCurate && exhibition.curatorId === currentUser?.id && (
                  <button
                    onClick={() => handleDelete(exhibition.id)}
                    className="text-xs text-red-300 hover:text-red-200 underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })
        )}
      </div>

      {openCreate && canCurate && (
        <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-6">
          <h3 className="font-serif text-lg font-semibold mb-4">Create exhibition</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#4F473D]">Title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Exhibition title"
                className="w-full px-3 py-2 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#4F473D]">Description</label>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
                placeholder="Describe the exhibition&hellip;"
                className="w-full px-3 py-2 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#4F473D]">Start date</label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#4F473D]">End date</label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#4F473D]">Location</label>
              <input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Gallery or city"
                className="w-full px-3 py-2 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="virtual"
                type="checkbox"
                checked={draft.isVirtual}
                onChange={(e) => setDraft({ ...draft, isVirtual: e.target.checked })}
                className="h-4 w-4 text-[#C59B47] border-[#D4C5B0] rounded focus:ring-[#C59B47]"
              />
              <label htmlFor="virtual" className="text-sm text-[#5C554C]">
                Virtual exhibition
              </label>
            </div>
            {draft.isVirtual && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#4F473D]">Virtual URL</label>
                <input
                  value={draft.virtualUrl}
                  onChange={(e) => setDraft({ ...draft, virtualUrl: e.target.value })}
                  placeholder="https://example.com/exhibition"
                  className="w-full px-3 py-2 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
                />
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <input
                id="featured"
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                className="h-4 w-4 text-[#C59B47] border-[#D4C5B0] rounded focus:ring-[#C59B47]"
              />
              <label htmlFor="featured" className="text-sm text-[#5C554C]">
                Featured exhibition
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#5C554C] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                  color: '#141312',
                }}
              >
                {submitting ? 'Creating&hellip;' : 'Create exhibition'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
