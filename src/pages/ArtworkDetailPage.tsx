import React, { useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Bookmark,
  Expand,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import { MakeOfferModal } from '../components/negotiation/MakeOfferModal';
import { PurchaseIntentModal } from '../components/negotiation/PurchaseIntentModal';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { ROLE_PERMISSIONS } from '../types/artverse';
import {
  formatAvailabilityLabel,
  formatCategoryLabel,
  formatMoney,
  formatSaleModeLabel,
} from '../utils/formatters';
import marbleArtwork from '../assets/images/art_marble_form_1792993238374.jpg';

export const ArtworkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const {
    artworks,
    getArtworkById,
    getProfileById,
    savedArtworkIds,
    followedArtistIds,
    toggleSaveArtwork,
    toggleFollowArtist,
    openOrCreateConversation,
    makeOffer,
    createOrderIntent,
    currentUser,
  } = useArtVerse();

  const artwork = id ? getArtworkById(id) : undefined;
  const artist = artwork ? getProfileById(artwork.artistId) : undefined;

  const [activeView, setActiveView] = useState<'full' | 'detail' | 'atelier'>(
    'full'
  );
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [isHoveringPlate, setIsHoveringPlate] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  if (!artwork) {
    return (
      <div className="max-w-[1380px] mx-auto px-5 sm:px-8 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[#141312]">
          Artwork Not Found
        </h1>
        <p className="text-sm text-[#575048]">
          This catalogue entry may have been removed or moved.
        </p>
        <Link
          to="/gallery"
          className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl"
        >
          Return to Gallery
        </Link>
      </div>
    );
  }

  const isSaved = savedArtworkIds.includes(artwork.id);
  const isFollowing = artist ? followedArtistIds.includes(artist.id) : false;
  const canBuyNow =
    artwork.availability !== 'sold' &&
    (artwork.saleMode === 'buy_now' ||
      artwork.saleMode === 'buy_now_and_negotiation');
  const canNegotiate =
    artwork.availability !== 'sold' &&
    (artwork.saleMode === 'negotiation_only' ||
      artwork.saleMode === 'buy_now_and_negotiation');
  
  const permissions = currentUser
    ? ROLE_PERMISSIONS[currentUser.role]
    : ROLE_PERMISSIONS.art_lover;
  const canAcquire = permissions.canPurchase && canBuyNow;
  const canContactArtist = !currentUser || (currentUser.role === 'collector' || currentUser.role === 'art_lover');
  const canMakeOffer = permissions.canMakeOffers && canNegotiate;

  const moreFromGallery = artworks
    .filter((a) => a.id !== artwork.id)
    .slice(0, 3);

  const handleContactArtist = async () => {
    if (!currentUser) {
      navigate('/login', { state: { from: location } });
      return;
    }
    const conv = await openOrCreateConversation(artwork.id);
    navigate(`/messages?conv=${conv.id}`);
  };

  const handleOfferSubmit = async (payload: {
    amount: number;
    currency: string;
    note: string;
  }) => {
    const conv = await openOrCreateConversation(artwork.id);
    await makeOffer({
      conversationId: conv.id,
      amount: payload.amount,
      currency: payload.currency,
      note: payload.note,
    });
    navigate(`/messages?conv=${conv.id}`);
  };

  const handlePlatePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || activeView !== 'detail') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  return (
    <div className="w-full relative isolate">
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url("${marbleArtwork}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity: 0.06,
        }}
      />
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(250, 248, 243, 0.94) 0%, rgba(247, 243, 237, 0.96) 100%)',
        }}
      />
      <div className="bg-transparent w-full">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-6 sm:py-8 lg:py-12">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#575048] hover:text-[#141312] mb-6 sm:mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Exhibition Catalogue
        </Link>

        {/* Museum Accession Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-start">
          {/* Left: Interactive Artwork Viewer & Loupe */}
          <div className="lg:col-span-7 space-y-4 min-w-0">
            <div
              onPointerMove={handlePlatePointerMove}
              onPointerEnter={() => setIsHoveringPlate(true)}
              onPointerLeave={() => setIsHoveringPlate(false)}
              className={`relative rounded-2xl overflow-hidden bg-[#EAE3D5] border border-[#E6DFD3] aspect-[4/3] sm:aspect-[5/4] shadow-[0_22px_50px_-20px_rgba(20,19,18,0.14)] ${
                activeView === 'detail' ? 'cursor-zoom-in' : ''
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={
                    shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.99 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={
                    activeView === 'detail' && !shouldReduceMotion
                      ? {
                          transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                          transform: isHoveringPlate ? 'scale(1.85)' : 'scale(1.3)',
                        }
                      : undefined
                  }
                  className="w-full h-full transition-transform duration-200 ease-out"
                >
                  <ArtworkImage
                    imageKey={
                      activeView === 'atelier'
                        ? 'atelier_editorial_cover'
                        : artwork.imageKey
                    }
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>

              {activeView === 'detail' && (
                <div className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141312]/80 backdrop-blur-md text-[#FAF8F3] text-xs">
                  <Search className="w-3.5 h-3.5 text-[#D4AE62]" />
                  <span>Move cursor to inspect surface brushwork</span>
                </div>
              )}

              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => setLightboxOpen(true)}
                aria-label="Inspect full-scale artwork view"
                className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141312]/85 backdrop-blur-md text-[#FAF8F3] text-xs font-medium hover:bg-[#141312] transition-colors"
              >
                <Expand className="w-3.5 h-3.5" />
                Inspect Plate
              </motion.button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-[#EFEAE0] rounded-xl max-w-full overflow-x-auto no-scrollbar">
                {[
                  { id: 'full' as const, label: 'Full Framing' },
                  { id: 'detail' as const, label: 'Interactive Loupe' },
                  { id: 'atelier' as const, label: 'Atelier Scale' },
                ].map((tab) => {
                  const active = activeView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveView(tab.id)}
                      className={`relative px-3 sm:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'text-[#141312]'
                          : 'text-[#575048] hover:text-[#141312]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={
                            shouldReduceMotion ? undefined : 'artwork-plate-tab'
                          }
                          transition={{
                            type: 'spring',
                            stiffness: 420,
                            damping: 32,
                          }}
                          className="absolute inset-0 bg-white rounded-lg shadow-xs"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-serif italic text-[#6B655E] truncate">
                Accession {artwork.accessionNumber} · {artwork.dimensions}
              </p>
            </div>
          </div>

          {/* Right: Curatorial Details & Acquisition Controls */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-7"
          >
            <div className="space-y-2 pb-6 border-b border-[#E6DFD3]">
              <div className="flex items-center gap-2 text-xs text-[#787066]">
                <span>{formatCategoryLabel(artwork.category)}</span>
                <span aria-hidden="true">·</span>
                <span>{artwork.year}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312]">
                {artwork.title}
              </h1>

              {artist && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Link
                    to={`/artists/${artist.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <ProfileAvatar
                      name={artist.fullName}
                      avatarKey={artist.avatarUrl}
                      sizeClass="w-10 h-10 text-sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-[#141312] group-hover:text-[#9E7B3B] transition-colors">
                        {artist.fullName}
                      </p>
                      <p className="text-xs text-[#787066]">{artist.location}</p>
                    </div>
                  </Link>
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
                    onClick={() => {
                      if (!currentUser) {
                        navigate('/login', { state: { from: location } });
                        return;
                      }
                      void toggleFollowArtist(artist.id);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isFollowing
                        ? 'bg-[#141312] text-[#FAF8F3]'
                        : 'bg-[#EFEAE0] text-[#141312] hover:bg-[#E4DDD0]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow Artist'}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Price, Availability & Acquisition Actions */}
            <div className="p-6 rounded-2xl shadow-[0_20px_60px_-20px_rgba(20,19,18,0.15)] space-y-5" style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(16px) saturate(180%)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs text-[#787066]">Listed Gallery Price</p>
                  <p className="font-mono text-2xl sm:text-3xl font-medium text-[#141312] tabular-nums mt-0.5">
                    {formatMoney(artwork.price, artwork.currency)}{' '}
                    <span className="text-sm text-[#787066]">
                      {artwork.currency}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-[#141312]">
                    {formatAvailabilityLabel(artwork.availability)}
                  </p>
                  <p className="text-xs text-[#787066] mt-0.5">
                    {formatSaleModeLabel(artwork.saleMode)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {canAcquire && canBuyNow && (
                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    onClick={() => {
                      if (!currentUser) {
                        navigate('/login', { state: { from: { pathname: `/artwork/${artwork.id}` } } });
                        return;
                      }
                      setPurchaseModalOpen(true);
                    }}
                    className="flex-1 px-5 py-3 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                      color: '#FAF8F3',
                      boxShadow: '0 6px 24px rgba(179, 139, 64, 0.4)',
                    }}
                  >
                    Buy Artwork
                  </motion.button>
                )}

                {canMakeOffer && (
                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    onClick={() => {
                      if (!currentUser) {
                        navigate('/login', { state: { from: location } });
                        return;
                      }
                      setOfferModalOpen(true);
                    }}
                    className="flex-1 px-5 py-3 text-sm font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] transition-colors whitespace-nowrap"
                  >
                    Make an Offer
                  </motion.button>
                )}
                {!canAcquire && !canMakeOffer && currentUser && (
                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    onClick={() => {
                      navigate('/signup', { state: { role: 'collector', from: location } });
                    }}
                    className="flex-1 px-5 py-3 text-sm font-medium bg-[#B38B40] text-[#FAF8F3] rounded-xl hover:bg-[#C69D4E] transition-colors whitespace-nowrap"
                  >
                    Become a Collector to Buy
                  </motion.button>
                )}
              </div>

              {currentUser && !canAcquire && !canMakeOffer && (
                <p className="text-xs text-[#787066]">
                  Purchase and offer actions are available to Collector accounts.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <motion.button
                  type="button"
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                  onClick={() => {
                    if (!currentUser) {
                      navigate('/login', { state: { from: location } });
                      return;
                    }
                    void toggleSaveArtwork(artwork.id);
                  }}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                    isSaved
                      ? 'bg-[#F5EFE2] border-[#C9B07A] text-[#141312]'
                      : 'bg-[#FAF8F3] border-[#DED6C6] text-[#3B352F] hover:border-[#B38B40]'
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      isSaved ? 'fill-[#9E7B3B] text-[#9E7B3B]' : ''
                    }`}
                  />
                  {isSaved ? 'Saved in Collection' : 'Save to Collection'}
                </motion.button>

                {canContactArtist && (
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                    onClick={handleContactArtist}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl border border-[#DED6C6] bg-[#FAF8F3] text-[#3B352F] hover:border-[#B38B40] transition-colors whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Contact Artist
                  </motion.button>
                )}
              </div>

              <p className="text-xs text-[#787066] leading-relaxed">
                {artwork.saleMode === 'negotiation_only'
                  ? 'This artist accepts acquisitions exclusively via private offer dialogue.'
                  : 'Buy Now opens an honest checkout preview without charging payment until payment gateway settlement is configured.'}
              </p>
            </div>

            {/* Curatorial Statement */}
            <div className="space-y-3">
              <h2 className="font-serif text-xl font-semibold text-[#141312]">
                Curatorial Notes
              </h2>
              <p className="text-sm text-[#4F4840] leading-relaxed">
                {artwork.description}
              </p>
            </div>

            {/* Museum Accession Metadata Grid */}
            <div className="pt-2">
              <h2 className="font-serif text-xl font-semibold text-[#141312] mb-3">
                Catalogue Specification
              </h2>
              <dl className="divide-y divide-[#E6DFD3] border-y border-[#E6DFD3] text-sm">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[#6B655E]">Accession No.</dt>
                  <dd className="font-mono text-xs text-[#141312] tabular-nums">
                    {artwork.accessionNumber}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[#6B655E]">Medium</dt>
                  <dd className="text-[#141312] text-right">{artwork.medium}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[#6B655E]">Dimensions</dt>
                  <dd className="font-mono text-xs text-[#141312] tabular-nums">
                    {artwork.dimensions}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[#6B655E]">Edition</dt>
                  <dd className="text-[#141312] text-right">
                    {artwork.editionInfo}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-[#6B655E]">Provenance</dt>
                  <dd className="text-[#141312] text-right max-w-xs">
                    {artwork.provenance}
                  </dd>
                </div>
              </dl>
            </div>
          </motion.div>
        </div>

        {/* Related Works */}
        {moreFromGallery.length > 0 && (
          <section className="mt-20 pt-14 border-t border-[#E6DFD3]">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
                  Further Viewing
                </p>
                <h2 className="font-serif text-3xl font-semibold text-[#141312] mt-1">
                  Related Works in the Salon
                </h2>
              </div>
              <Link
                to="/gallery"
                className="text-sm font-medium text-[#9E7B3B] hover:text-[#141312] transition-colors"
              >
                Full Catalogue →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {moreFromGallery.map((item) => (
                <ArtworkCard key={item.id} artwork={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-50 bg-[#141312]/92 backdrop-blur-md p-3 sm:p-6 overflow-y-auto flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close high-resolution plate viewer"
              className="fixed top-4 right-4 sm:top-6 sm:right-6 z-10 w-10 h-10 rounded-full bg-[#292623] text-[#FAF8F3] flex items-center justify-center hover:bg-[#3B352F]"
            >
              <X className="w-5 h-5" />
            </button>
            <motion.div
              initial={
                shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full max-h-[82dvh] aspect-[4/3] rounded-2xl overflow-hidden border border-[#3B352F] my-auto"
            >
              <ArtworkImage
                imageKey={artwork.imageKey}
                alt={artwork.title}
                className="w-full h-full object-contain bg-[#141312]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MakeOfferModal
        artwork={artwork}
        isOpen={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        onSubmitOffer={handleOfferSubmit}
      />

      <PurchaseIntentModal
        artwork={artwork}
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onCreateIntent={createOrderIntent}
      />
      </div>
    </div>
  );
};
