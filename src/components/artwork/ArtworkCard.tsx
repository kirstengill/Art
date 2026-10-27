import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'motion/react';
import { ArrowUpRight, Bookmark, ShoppingBag, Eye, AlertCircle, X } from 'lucide-react';
import type { Artwork } from '../../types/artverse';
import { useArtVerse } from '../../context/ArtVerseContext';
import { ArtworkImage } from '../../data/artworkImages';
import {
  formatAvailabilityLabel,
  formatCategoryLabel,
  formatMoney,
} from '../../utils/formatters';
import { ROLE_PERMISSIONS } from '../../types/artverse';

interface ArtworkCardProps {
  artwork: Artwork;
  aspectClass?: string;
}

export const ArtworkCard: React.FC<ArtworkCardProps> = ({
  artwork,
  aspectClass = 'aspect-[4/5]',
}) => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { getProfileById, savedArtworkIds, toggleSaveArtwork, currentUser } = useArtVerse();
  const artist = getProfileById(artwork.artistId);
  const isSaved = savedArtworkIds.includes(artwork.id);

  const cardRef = useRef<HTMLElement | null>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 260, damping: 26 });
  const smoothY = useSpring(mouseY, { stiffness: 260, damping: 26 });

  const rotateX = useTransform(smoothY, [0, 1], [2, -2]);
  const rotateY = useTransform(smoothX, [0, 1], [-2, 2]);
  const sheenX = useTransform(smoothX, [0, 1], ['0%', '100%']);
  const sheenY = useTransform(smoothY, [0, 1], ['0%', '100%']);
  const sheenBg = useMotionTemplate`radial-gradient(400px circle at ${sheenX} ${sheenY}, rgba(255, 250, 240, 0.25), transparent 70%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mouseX.set(Math.max(0, Math.min(1, nx)));
    mouseY.set(Math.max(0, Math.min(1, ny)));
  };

  const handlePointerLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const canPurchase = artwork.availability !== 'sold' && 
    (artwork.saleMode === 'buy_now' || artwork.saleMode === 'buy_now_and_negotiation');
  
  const permissions = currentUser ? ROLE_PERMISSIONS[currentUser.role] : { canPurchase: false, canUploadArtwork: false };
  const userCanPurchase = permissions.canPurchase && canPurchase;
  const isForSale = canPurchase && artwork.availability === 'available';
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handlePurchase = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login', { state: { from: { pathname: `/artwork/${artwork.id}` } } });
      return;
    }
    
    // Check if user has permission to purchase
    if (!permissions.canPurchase) {
      // User is an art_lover - show upgrade prompt
      setShowUpgradePrompt(true);
      return;
    }
    
    navigate(`/artwork/${artwork.id}`);
  };

  const handleCloseUpgradePrompt = () => {
    setShowUpgradePrompt(false);
  };

  const handleUpgradeToCollector = () => {
    setShowUpgradePrompt(false);
    navigate('/signup', { state: { role: 'collector', from: { pathname: `/artwork/${artwork.id}` } } });
  };

  return (
    <motion.article
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={shouldReduceMotion ? undefined : { y: -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={
        shouldReduceMotion
          ? {
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px rgba(20, 19, 18, 0.08)',
            }
          : {
              rotateX,
              rotateY,
              transformPerspective: 1200,
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px rgba(20, 19, 18, 0.08)',
            }
      }
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_24px_60px_-20px_rgba(20,19,18,0.18)]"
    >
      {/* Sheen effect */}
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          style={{ background: sheenBg }}
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
        />
      )}

      <div className={`relative ${aspectClass} overflow-hidden bg-[#F1ECE2]`}>
        <Link
          to={`/artwork/${artwork.id}`}
          aria-label={`View details for ${artwork.title}`}
          className="block w-full h-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#9E7B3B]"
        >
          <div
            className={`w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              shouldReduceMotion ? '' : 'group-hover:scale-[1.08]'
            }`}
          >
            <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} />
          </div>
        </Link>

        {/* Save button */}
        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault();
            if (!currentUser) {
              navigate('/login', {
                state: { from: { pathname: `/artwork/${artwork.id}` } },
              });
              return;
            }
            void toggleSaveArtwork(artwork.id);
          }}
          aria-label={isSaved ? 'Remove from saved collection' : 'Save to collection'}
          aria-pressed={isSaved}
          className="absolute top-3.5 right-3.5 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#9E7B3B]"
          style={{
            background: isSaved ? 'rgba(20, 19, 18, 0.9)' : 'rgba(250, 248, 243, 0.9)',
            color: isSaved ? '#E6C98F' : '#141312',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#E6C98F]' : ''}`} />
        </motion.button>

        {/* Availability badge */}
        <div className="absolute top-3.5 left-3.5 z-20">
          {artwork.availability === 'sold' ? (
            <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-red-500/90 text-white border border-white/30">
              Sold
            </span>
          ) : artwork.availability === 'reserved' ? (
            <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-amber-500/90 text-white border border-white/30">
              Reserved
            </span>
          ) : isForSale ? (
            <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-emerald-500/90 text-white border border-white/30">
              For Sale
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-[#141312]/80 text-[#FAF8F3] border border-white/30">
              Community Artwork
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-[#787066]">
            <span>{formatCategoryLabel(artwork.category)}</span>
            <span aria-hidden="true">·</span>
            <span>{artwork.year}</span>
          </div>

          <h3 className="font-serif text-xl sm:text-[1.4rem] font-semibold text-[#141312] leading-snug">
            <Link
              to={`/artwork/${artwork.id}`}
              className="hover:text-[#9E7B3B] transition-colors focus-visible:outline-2 focus-visible:outline-[#9E7B3B]"
            >
              {artwork.title}
            </Link>
          </h3>

          {artist && (
            <p className="text-sm text-[#575048]">
              <Link
                to={`/artists/${artist.id}`}
                className="hover:text-[#141312] transition-colors"
              >
                By {artist.fullName}
              </Link>
            </p>
          )}

          {isForSale && (
            <p className="font-mono text-lg font-semibold text-[#141312] tabular-nums pt-1">
              {formatMoney(artwork.price, artwork.currency)}
            </p>
          )}
          {!isForSale && artwork.availability !== 'sold' && (
            <p className="text-sm font-medium text-[#787066] italic">
              Not for Sale
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Link
            to={`/artwork/${artwork.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(209, 196, 171, 0.6)',
              color: '#141312',
            }}
          >
            <Eye className="w-4 h-4" />
            <span>View Artwork</span>
          </Link>
          {isForSale && userCanPurchase && (
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={handlePurchase}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                color: '#FAF8F3',
                border: '1px solid rgba(179, 139, 64, 0.5)',
                boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy Artwork</span>
            </motion.button>
          )}
          {isForSale && !userCanPurchase && currentUser && currentUser.role === 'art_lover' && (
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={handlePurchase}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
              style={{
                background: 'rgba(179, 139, 64, 0.2)',
                color: '#141312',
                border: '1px solid rgba(179, 139, 64, 0.5)',
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy Artwork</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Upgrade to Collector Prompt Modal */}
      <AnimatePresence>
        {showUpgradePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseUpgradePrompt}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FAF8F3] rounded-2xl p-6 max-w-md w-full"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCloseUpgradePrompt}
                className="float-right -m-1 p-1 rounded-full text-[#575048] hover:text-[#141312] hover:bg-[#E6DFD3]"
              >
                <X className="w-4 h-4" />
              </motion.button>
              
              <div className="text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                
                <h3 className="font-serif text-xl font-semibold text-[#141312]">
                  Create a Collector Account
                </h3>
                
                <p className="text-sm text-[#575048] leading-relaxed">
                  To purchase artwork, you'll need a Collector account. 
                  As an Art Lover, you can browse and view all artwork, but Collectors 
                  can purchase pieces and maintain a personal collection gallery.
                </p>
                
                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpgradeToCollector}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                    style={{
                      background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                      color: '#FAF8F3',
                      boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
                    }}
                  >
                    Become a Collector
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCloseUpgradePrompt}
                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#E6DFD3] text-[#141312] hover:bg-[#D8D0C4] transition-colors"
                  >
                    Continue Browsing
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};
