import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useReducedMotion,
  AnimatePresence,
} from 'motion/react';
import { Bookmark, ShoppingCart, Eye, AlertCircle, X } from 'lucide-react';
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

  const canPurchase = artwork.availability !== 'sold' && 
    (artwork.saleMode === 'buy_now' || artwork.saleMode === 'buy_now_and_negotiation');
  
  const permissions = currentUser ? ROLE_PERMISSIONS[currentUser.role] : { canPurchase: false, canUploadArtwork: false };
  const userCanPurchase = permissions.canPurchase && canPurchase;
  const isForSale = canPurchase && artwork.availability === 'available';
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handlePurchaseClick = (e: React.MouseEvent) => {
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
    
    // Show purchase modal
    setShowPurchaseModal(true);
  };

  const handleProceedToPurchase = () => {
    setShowPurchaseModal(false);
    navigate(`/artwork/${artwork.id}`);
  };

  const handleCloseUpgradePrompt = () => {
    setShowUpgradePrompt(false);
  };

  const handleUpgradeToCollector = () => {
    setShowUpgradePrompt(false);
    navigate('/signup', { state: { role: 'collector', from: { pathname: `/artwork/${artwork.id}` } } });
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleSaveArtwork(artwork.id);
  };

  return (
    <>
      <motion.article
        whileHover={shouldReduceMotion ? undefined : { y: -8, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="group relative flex flex-col bg-[#141312] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#B38B40] hover:shadow-[0_20px_60px_-20px_rgba(179,139,64,0.15)]"
      >
        {/* Artwork Image */}
        <div className={`relative ${aspectClass} overflow-hidden bg-[#1E1C1A]`}>
          <Link
            to={`/artwork/${artwork.id}`}
            className="block w-full h-full"
          >
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} />
            </motion.div>
          </Link>

          {/* Save Button */}
          <motion.button
            type="button"
            whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            onClick={handleToggleSave}
            aria-label={isSaved ? 'Remove from saved collection' : 'Save to collection'}
            aria-pressed={isSaved}
            className="absolute top-3.5 right-3.5 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: isSaved ? 'rgba(179, 139, 64, 0.95)' : 'rgba(255, 255, 255, 0.15)',
              color: isSaved ? '#141312' : '#FAF8F3',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#141312]' : ''}`} />
          </motion.button>

          {/* Status Badge */}
          <div className="absolute top-3.5 left-3.5 z-20">
            {isForSale ? (
              <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-[#B38B40] text-[#141312] border border-white/30">
                For Sale
              </span>
            ) : artwork.availability === 'sold' ? (
              <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-red-500/90 text-white border border-white/30">
                Sold
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide rounded-lg backdrop-blur-md bg-[#8B5CF6] text-white border border-white/30">
                Community
              </span>
            )}
          </div>
        </div>

        {/* Artwork Details */}
        <div className="p-5 flex-1 flex flex-col gap-4 bg-[#1E1C1A]">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#B38B40]">
              <span>{formatCategoryLabel(artwork.category)}</span>
              <span aria-hidden="true">·</span>
              <span>{artwork.year}</span>
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#FAF8F3] leading-snug group-hover:text-[#B38B40] transition-colors">
              <Link
                to={`/artwork/${artwork.id}`}
                className="hover:text-[#B38B40] transition-colors"
              >
                {artwork.title}
              </Link>
            </h3>

            {artist && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  {artist.avatarUrl ? (
                    <img
                      src={artist.avatarUrl}
                      alt={artist.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2A2724] text-white text-xs font-bold">
                      {artist.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-sm text-[#C8C1B6]">{artist.fullName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <p className="font-mono text-lg font-semibold text-[#B38B40] tabular-nums">
              {formatMoney(artwork.price, artwork.currency)}
            </p>
            
            {isForSale && userCanPurchase && (
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                onClick={handlePurchaseClick}
                className="flex items-center gap-1.5 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                  color: '#FAF8F3',
                  border: '1px solid rgba(179, 139, 64, 0.5)',
                  boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Now</span>
              </motion.button>
            )}
            
            {isForSale && !userCanPurchase && currentUser && currentUser.role === 'art_lover' && (
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                onClick={handlePurchaseClick}
                className="flex items-center gap-1.5 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
                style={{
                  background: 'rgba(179, 139, 64, 0.2)',
                  color: '#FAF8F3',
                  border: '1px solid rgba(179, 139, 64, 0.5)',
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Now</span>
              </motion.button>
            )}
            
            {!isForSale && artwork.availability !== 'sold' && (
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                onClick={() => navigate(`/artwork/${artwork.id}`)}
                className="flex items-center gap-1.5 py-2.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FAF8F3',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Purchase Modal */}
        <AnimatePresence>
          {showPurchaseModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-[#141312]/80 backdrop-blur-[3px]"
            >
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[88dvh] flex flex-col bg-[#1E1C1A] border border-[#DFD8CA]/20 rounded-2xl shadow-xl overflow-hidden my-auto"
              >
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E6DFD3]/20 shrink-0">
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#FAF8F3]">
                    Confirm Purchase
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    aria-label="Close"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[#B38B40] hover:bg-[#2A2724] hover:text-[#FAF8F3] transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#E6DFD3]/30">
                      <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-semibold text-[#FAF8F3] truncate">
                        {artwork.title}
                      </h3>
                      {artist && (
                        <p className="text-sm text-[#C8C1B6] mt-0.5">{artist.fullName}</p>
                      )}
                      <p className="font-mono text-lg font-semibold text-[#B38B40] tabular-nums mt-1">
                        {formatMoney(artwork.price, artwork.currency)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[#C8C1B6] leading-relaxed">
                    {artwork.description.slice(0, 150)}{artwork.description.length > 150 ? '...' : ''}
                  </p>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPurchaseModal(false)}
                      className="px-5 py-2.5 text-sm font-medium bg-[#2A2724] text-[#C8C1B6] rounded-xl hover:bg-[#3A352F] transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                      onClick={handleProceedToPurchase}
                      className="px-5 py-2.5 text-sm font-medium rounded-xl transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                        color: '#141312',
                        boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
                      }}
                    >
                      Proceed to Purchase
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upgrade to Collector Prompt Modal */}
        <AnimatePresence>
          {showUpgradePrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-[#141312]/80 backdrop-blur-[3px]"
            >
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[88dvh] flex flex-col bg-[#1E1C1A] border border-[#DFD8CA]/20 rounded-2xl shadow-xl overflow-hidden my-auto"
              >
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E6DFD3]/20 shrink-0">
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#FAF8F3]">
                    Create a Collector Account
                  </h2>
                  <button
                    type="button"
                    onClick={handleCloseUpgradePrompt}
                    aria-label="Close"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[#B38B40] hover:bg-[#2A2724] hover:text-[#FAF8F3] transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#B38B40]/10 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-[#B38B40]" />
                    </div>
                    
                    <p className="text-sm text-[#C8C1B6] leading-relaxed">
                      To purchase artwork, you'll need a Collector account. As an Art Lover, you can browse and view all artwork, but Collectors can purchase pieces and maintain a personal collection gallery.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpgradeToCollector}
                      className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                        color: '#141312',
                        boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
                      }}
                    >
                      Become a Collector
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCloseUpgradePrompt}
                      className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#2A2724] text-[#C8C1B6] hover:bg-[#3A352F] transition-colors"
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
    </>
  );
};
