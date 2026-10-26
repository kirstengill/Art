import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Edit3, Eye, LogOut, Plus, Trash2 } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import {
  formatAvailabilityLabel,
  formatCategoryLabel,
  formatMoney,
  formatOfferStatusLabel,
  formatRoleLabel,
  formatSaleModeLabel,
} from '../utils/formatters';
import type { UserRole } from '../types/artverse';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DashboardPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const {
    artworks,
    offers,
    orderIntents,
    savedArtworkIds,
    currentUser,
    authMode,
    switchRole,
    logout,
    deleteArtwork,
    getArtworkById,
    getProfileById,
  } = useArtVerse();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Show user's own listings when signed in via Google, or Clara Vance's + user's demo works in Demo/Guest mode
  const managedOwnerId =
    authMode === 'authenticated' && currentUser
      ? currentUser.id
      : currentUser?.role === 'artist'
      ? currentUser.id
      : 'artist-clara-vance';

  const managedListings = artworks.filter(
    (art) =>
      art.artistId === managedOwnerId ||
      (authMode !== 'authenticated' && art.id.startsWith('art-demo-'))
  );

  const incomingOffers = offers.filter(
    (o) =>
      managedListings.some((art) => art.id === o.artworkId) ||
      o.recipientId === managedOwnerId
  );

  const savedWorks = artworks.filter((a) => savedArtworkIds.includes(a.id));

  const totalPortfolioValue = managedListings.reduce(
    (acc, item) => acc + item.price,
    0
  );

  const handleConfirmDelete = async (artworkId: string) => {
    setDeletingId(artworkId);
    try {
      await deleteArtwork(artworkId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const kpiCards = [
    {
      label: 'Managed Studio Listings',
      value: String(managedListings.length),
      sub:
        authMode === 'authenticated'
          ? 'Saved to your permanent member portfolio'
          : 'Editable in active session state',
    },
    {
      label: 'Catalogue Asking Value',
      value: formatMoney(totalPortfolioValue, 'USD'),
      sub: 'Across active & reserved works',
    },
    {
      label: 'Collector Offers',
      value: String(incomingOffers.length),
      sub: `${incomingOffers.filter((o) => o.status === 'pending').length} awaiting response`,
    },
    {
      label: 'Saved Collector Shortlist',
      value: String(savedWorks.length),
      sub: `${orderIntents.length} unpaid purchase ${
        orderIntents.length === 1 ? 'intent' : 'intents'
      }`,
    },
  ];

  return (
    <div className="w-full">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-12 lg:py-16 space-y-10 sm:space-y-12">
        {/* Studio Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-[#E6DFD3]"
        >
          <div className="flex items-center gap-4 min-w-0">
            <ProfileAvatar
              name={currentUser?.fullName || 'Clara Vance (Demo Studio)'}
              avatarKey={currentUser?.avatarUrl || 'hero_gilded_horizon'}
              sizeClass="w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-[#8C6828]">
                {authMode === 'authenticated'
                  ? `Member Account · ${formatRoleLabel(currentUser!.role)}`
                  : authMode === 'demo'
                  ? `Demo Session · ${formatRoleLabel(currentUser!.role)}`
                  : 'Curatorial Demo Studio Preview'}
              </p>
              <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-[#141312] mt-0.5 text-balance truncate">
                {currentUser
                  ? `${currentUser.fullName} — Studio`
                  : 'Artist Studio Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
            {currentUser && (
              <div className="flex items-center gap-1 p-1 bg-[#EFEAE0] rounded-xl relative max-w-full overflow-x-auto no-scrollbar">
                {(['artist', 'collector', 'art_lover'] as UserRole[]).map((role) => {
                  const active = currentUser.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => switchRole(role)}
                      className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 z-10 ${
                        active
                          ? 'text-[#141312]'
                          : 'text-[#5C554C] hover:text-[#141312]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="dashboard-role-pill"
                          transition={{
                            type: 'spring',
                            stiffness: 480,
                            damping: 36,
                          }}
                          className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                        />
                      )}
                      {formatRoleLabel(role)}
                    </button>
                  );
                })}
              </div>
            )}

            <Link
              to="/add-artwork"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Publish New Artwork
            </Link>

            {currentUser ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-white border border-[#D8D0C1] text-[#3B352F] rounded-xl hover:border-[#B38B40] transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2.5 text-xs font-medium bg-white border border-[#D8D0C1] text-[#141312] rounded-xl hover:border-[#B38B40] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In to Save Portfolio
              </Link>
            )}
          </div>
        </motion.div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiCards.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.24,
                delay: idx * 0.05,
                ease: EASE_OUT,
              }}
              className="p-6 bg-white border border-[#E6DFD3] rounded-2xl hover:border-[#D3C7B2] transition-colors"
            >
              <p className="text-xs text-[#7A7267]">{kpi.label}</p>
              <p className="font-mono text-3xl font-semibold text-[#141312] tabular-nums mt-2">
                {kpi.value}
              </p>
              <p className="text-xs text-[#6B655E] mt-1.5">{kpi.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Managed Artwork Listings Table */}
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#141312]">
                Studio Inventory & Listings
              </h2>
              <p className="text-xs text-[#6B655E] mt-1">
                Manage pricing, availability, and acquisition terms for published works.
              </p>
            </div>
            <Link
              to="/add-artwork"
              className="text-xs font-medium text-[#8C6828] hover:text-[#141312] transition-colors whitespace-nowrap"
            >
              + Add Listing
            </Link>
          </div>

          {managedListings.length === 0 ? (
            <div className="p-12 bg-white border border-[#E6DFD3] rounded-2xl text-center space-y-4">
              <h3 className="font-serif text-2xl font-semibold text-[#141312]">
                No studio listings published yet
              </h3>
              <p className="text-sm text-[#5C554C] max-w-md mx-auto">
                Upload your first original painting, sculpture, photograph, or edition to
                open collector inquiries and offers.
              </p>
              <Link
                to="/add-artwork"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Listing
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Responsive Card List */}
              <div className="md:hidden space-y-3">
                {managedListings.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 bg-white border border-[#E6DFD3] rounded-2xl space-y-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#E6DFD3] shrink-0">
                        <ArtworkImage imageKey={art.imageKey} alt={art.title} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/artwork/${art.id}`}
                          className="font-serif text-lg font-semibold text-[#141312] hover:text-[#B38B40] transition-colors block truncate"
                        >
                          {art.title}
                        </Link>
                        <p className="text-xs text-[#7A7267] tabular-nums truncate">
                          {formatCategoryLabel(art.category)} · {art.dimensions} · {art.year}
                        </p>
                        <p className="font-mono text-sm font-medium text-[#141312] tabular-nums mt-0.5">
                          {formatMoney(art.price, art.currency)} {art.currency}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#ECE6DA] flex items-center justify-between gap-2 text-xs">
                      <span className="text-[#5C554C] truncate">
                        {formatAvailabilityLabel(art.availability)} ·{' '}
                        {formatSaleModeLabel(art.saleMode)}
                      </span>
                      {confirmDeleteId === art.id ? (
                        <div className="inline-flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={deletingId === art.id}
                            onClick={() => handleConfirmDelete(art.id)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-[#992E24] text-white rounded-lg"
                          >
                            {deletingId === art.id ? 'Removing...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 text-xs text-[#5C554C]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 shrink-0">
                          <Link
                            to={`/artwork/${art.id}`}
                            aria-label={`View ${art.title}`}
                            className="p-2 rounded-lg text-[#5C554C] hover:bg-[#F3EFE6] hover:text-[#141312]"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/add-artwork?edit=${art.id}`}
                            aria-label={`Edit ${art.title}`}
                            className="p-2 rounded-lg text-[#5C554C] hover:bg-[#F3EFE6] hover:text-[#141312]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(art.id)}
                            aria-label={`Remove ${art.title}`}
                            className="p-2 rounded-lg text-[#5C554C] hover:bg-[#FBECE9] hover:text-[#992E24]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet Scrollable Table */}
              <div className="hidden md:block bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden overflow-x-auto artverse-scroll">
                <table className="w-full min-w-[680px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6DFD3] bg-[#FAF8F3] text-xs font-medium text-[#6B655E]">
                      <th className="py-4 px-5">Artwork</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4">Asking Price</th>
                      <th className="py-4 px-4">Sale Mode</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE6DA] text-sm">
                    <AnimatePresence initial={false}>
                      {managedListings.map((art) => (
                        <motion.tr
                          key={art.id}
                          layout
                          initial={shouldReduceMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
                          transition={{ duration: 0.18, ease: EASE_OUT }}
                          className="hover:bg-[#FAF8F3]/80 transition-colors"
                        >
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E6DFD3] shrink-0">
                                <ArtworkImage imageKey={art.imageKey} alt={art.title} />
                              </div>
                              <div>
                                <Link
                                  to={`/artwork/${art.id}`}
                                  className="font-serif text-lg font-semibold text-[#141312] hover:text-[#B38B40] transition-colors"
                                >
                                  {art.title}
                                </Link>
                                <p className="text-xs text-[#7A7267] tabular-nums">
                                  {art.dimensions} · {art.year}
                                  {art.isDemo ? ' · Demo' : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs text-[#5C554C]">
                            {formatCategoryLabel(art.category)}
                          </td>
                          <td className="py-4 px-4 font-mono text-sm text-[#141312] tabular-nums whitespace-nowrap">
                            {formatMoney(art.price, art.currency)} {art.currency}
                          </td>
                          <td className="py-4 px-4 text-xs text-[#5C554C]">
                            {formatSaleModeLabel(art.saleMode)}
                          </td>
                          <td className="py-4 px-4 text-xs text-[#141312]">
                            {formatAvailabilityLabel(art.availability)}
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            {confirmDeleteId === art.id ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={deletingId === art.id}
                                  onClick={() => handleConfirmDelete(art.id)}
                                  className="px-3 py-1.5 text-xs font-medium bg-[#992E24] text-white rounded-lg hover:bg-[#7D241C] transition-colors"
                                >
                                  {deletingId === art.id ? 'Removing...' : 'Confirm Remove'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1.5 text-xs text-[#5C554C] hover:text-[#141312]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <Link
                                  to={`/artwork/${art.id}`}
                                  aria-label={`View ${art.title}`}
                                  className="p-2 rounded-lg text-[#5C554C] hover:bg-[#F3EFE6] hover:text-[#141312] transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                  to={`/add-artwork?edit=${art.id}`}
                                  aria-label={`Edit ${art.title}`}
                                  className="p-2 rounded-lg text-[#5C554C] hover:bg-[#F3EFE6] hover:text-[#141312] transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(art.id)}
                                  aria-label={`Remove ${art.title}`}
                                  className="p-2 rounded-lg text-[#5C554C] hover:bg-[#FBECE9] hover:text-[#992E24] transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Active Collector Offers & Saved Shortlist */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-2xl font-semibold text-[#141312]">
                Recent Collector Offers
              </h2>
              <Link
                to="/messages"
                className="text-xs font-medium text-[#8C6828] hover:text-[#141312] transition-colors whitespace-nowrap"
              >
                Open Negotiation Desk →
              </Link>
            </div>

            {incomingOffers.length === 0 ? (
              <p className="text-sm text-[#6B655E]">
                No collector offers recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[#ECE6DA]">
                {incomingOffers.slice(0, 4).map((offer) => {
                  const art = getArtworkById(offer.artworkId);
                  const sender = getProfileById(offer.senderId);
                  return (
                    <div
                      key={offer.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-serif text-lg font-semibold text-[#141312] truncate">
                          {art?.title || 'Artwork'}
                        </p>
                        <p className="text-xs text-[#6B655E]">
                          From {sender?.fullName} · {formatOfferStatusLabel(offer.status)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium text-[#141312] tabular-nums">
                          {formatMoney(offer.amount, offer.currency)} {offer.currency}
                        </p>
                        <Link
                          to={`/messages?conv=${offer.conversationId}`}
                          className="text-xs font-medium text-[#8C6828] hover:text-[#141312] transition-colors"
                        >
                          Respond →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.25, delay: 0.05, ease: EASE_OUT }}
            className="bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-2xl font-semibold text-[#141312]">
                Saved Collection Shortlist
              </h2>
              <Link
                to="/gallery"
                className="text-xs font-medium text-[#8C6828] hover:text-[#141312] transition-colors whitespace-nowrap"
              >
                Explore Gallery →
              </Link>
            </div>

            {savedWorks.length === 0 ? (
              <p className="text-sm text-[#6B655E]">
                Save artworks from the gallery to compare works and track availability.
              </p>
            ) : (
              <div className="divide-y divide-[#ECE6DA]">
                {savedWorks.slice(0, 4).map((work) => (
                  <div
                    key={work.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#E6DFD3] shrink-0">
                        <ArtworkImage imageKey={work.imageKey} alt={work.title} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/artwork/${work.id}`}
                          className="font-serif text-lg font-semibold text-[#141312] hover:text-[#B38B40] transition-colors block truncate"
                        >
                          {work.title}
                        </Link>
                        <p className="text-xs text-[#7A7267] truncate">
                          {work.medium}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm text-[#141312] tabular-nums shrink-0">
                      {formatMoney(work.price, work.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </div>
  );
};
