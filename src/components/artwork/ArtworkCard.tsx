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
            
            {isForSale && (
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
                <span>Buy</span>
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
