import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useReducedMotion,
} from 'motion/react';
import { Bookmark, ShoppingCart, Eye } from 'lucide-react';
import type { Artwork } from '../../types/artverse';
import { useArtVerse } from '../../context/ArtVerseContext';
import { ArtworkImage } from '../../data/artworkImages';
import { PurchaseRequestModal } from '../purchase/PurchaseRequestModal';
import {
  formatCategoryLabel,
  formatMoney,
} from '../../utils/formatters';
import { isArtworkDirectlyPurchasable } from '../../utils/purchaseRequests';

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
  const { getProfileById, savedArtworkIds, toggleSaveArtwork } = useArtVerse();
  const artist = getProfileById(artwork.artistId);
  const isSaved = savedArtworkIds.includes(artwork.id);

  const isForSale = isArtworkDirectlyPurchasable(artwork.availability, artwork.saleMode);
  const [showPurchaseRequest, setShowPurchaseRequest] = useState(false);

  const handlePurchaseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPurchaseRequest(true);
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
        className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141312] transition-all duration-300 hover:border-[#B38B40] hover:shadow-[0_20px_60px_-20px_rgba(179,139,64,0.15)] sm:rounded-2xl"
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
              <ArtworkImage
                imageKey={artwork.imageKey}
                alt={artwork.title}
                className="h-full w-full object-contain"
              />
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
            className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 sm:right-3.5 sm:top-3.5 sm:h-10 sm:w-10"
            style={{
              background: isSaved ? 'rgba(179, 139, 64, 0.95)' : 'rgba(255, 255, 255, 0.15)',
              color: isSaved ? '#141312' : '#FAF8F3',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-[#141312]' : ''}`} />
          </motion.button>

          {/* Status Badge */}
          <div className="absolute left-2 top-2 z-20 sm:left-3.5 sm:top-3.5">
            {isForSale ? (
              <span className="rounded-md border border-white/30 bg-[#B38B40] px-1.5 py-1 text-[8px] font-medium uppercase tracking-wide text-[#141312] backdrop-blur-md sm:rounded-lg sm:px-2.5 sm:text-[10px]">
                For Sale
              </span>
            ) : artwork.availability === 'sold' ? (
              <span className="rounded-md border border-white/30 bg-red-500/90 px-1.5 py-1 text-[8px] font-medium uppercase tracking-wide text-white backdrop-blur-md sm:rounded-lg sm:px-2.5 sm:text-[10px]">
                Sold
              </span>
            ) : (
              <span className="rounded-md border border-white/30 bg-[#8B5CF6] px-1.5 py-1 text-[8px] font-medium uppercase tracking-wide text-white backdrop-blur-md sm:rounded-lg sm:px-2.5 sm:text-[10px]">
                Community
              </span>
            )}
          </div>
        </div>

        {/* Artwork Details */}
        <div className="flex flex-1 flex-col gap-3 bg-[#1E1C1A] p-3 sm:gap-4 sm:p-5">
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <div className="flex min-w-0 items-center gap-1 text-[10px] text-[#B38B40] sm:gap-1.5 sm:text-xs">
              <span>{formatCategoryLabel(artwork.category)}</span>
              <span aria-hidden="true">·</span>
              <span>{artwork.year}</span>
            </div>

            <h3 className="break-words font-serif text-base font-semibold leading-snug text-[#FAF8F3] transition-colors group-hover:text-[#B38B40] sm:text-xl lg:text-2xl">
              <Link
                to={`/artwork/${artwork.id}`}
                className="hover:text-[#B38B40] transition-colors"
              >
                {artwork.title}
              </Link>
            </h3>

            {artist && (
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/20 sm:h-8 sm:w-8">
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
                <span className="truncate text-xs text-[#C8C1B6] sm:text-sm">{artist.fullName}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
            <p className="min-w-0 font-mono text-sm font-semibold text-[#B38B40] tabular-nums sm:text-lg">
              {formatMoney(artwork.price, artwork.currency)}
            </p>
            
            {isForSale && (
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                onClick={handlePurchaseClick}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:rounded-xl sm:px-4 sm:text-sm"
                style={{
                  background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                  color: '#FAF8F3',
                  border: '1px solid rgba(179, 139, 64, 0.5)',
                  boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Buy</span>
              </motion.button>
            )}
            
            {!isForSale && artwork.availability !== 'sold' && (
              <motion.button
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                onClick={() => navigate(`/artwork/${artwork.id}`)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:rounded-xl sm:px-4 sm:text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FAF8F3',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <Eye className="h-4 w-4" />
                <span>View Details</span>
              </motion.button>
            )}
          </div>
        </div>

      </motion.article>
      <PurchaseRequestModal
        artwork={artwork}
        artist={artist}
        isOpen={showPurchaseRequest}
        onClose={() => setShowPurchaseRequest(false)}
      />
    </>
  );
};
