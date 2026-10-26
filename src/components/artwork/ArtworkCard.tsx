import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowUpRight, Bookmark, MessageSquare } from 'lucide-react';
import type { Artwork } from '../../types/artverse';
import { useArtVerse } from '../../context/ArtVerseContext';
import { ArtworkImage } from '../../data/artworkImages';
import {
  formatAvailabilityLabel,
  formatCategoryLabel,
  formatMoney,
  formatSaleModeLabel,
} from '../../utils/formatters';

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
  const {
    getProfileById,
    savedArtworkIds,
    toggleSaveArtwork,
    openOrCreateConversation,
  } = useArtVerse();
  const artist = getProfileById(artwork.artistId);
  const isSaved = savedArtworkIds.includes(artwork.id);

  const cardRef = useRef<HTMLElement | null>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 260, damping: 26 });
  const smoothY = useSpring(mouseY, { stiffness: 260, damping: 26 });

  const rotateX = useTransform(smoothY, [0, 1], [3.2, -3.2]);
  const rotateY = useTransform(smoothX, [0, 1], [-3.2, 3.2]);
  const sheenX = useTransform(smoothX, [0, 1], ['0%', '100%']);
  const sheenY = useTransform(smoothY, [0, 1], ['0%', '100%']);
  const sheenBg = useMotionTemplate`radial-gradient(360px circle at ${sheenX} ${sheenY}, rgba(255, 250, 238, 0.28), transparent 70%)`;

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

  const handleQuickInquire = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const conv = await openOrCreateConversation(artwork.id);
    navigate(`/messages?conv=${conv.id}`);
  };

  return (
    <motion.article
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={shouldReduceMotion ? undefined : { y: -5 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={
        shouldReduceMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              transformPerspective: 1100,
            }
      }
      className="group relative flex flex-col bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden transition-shadow duration-300 hover:border-[#CBB994] hover:shadow-[0_20px_44px_-16px_rgba(20,19,18,0.14)]"
    >
      {/* Subtle gallery raking light sheen on hover */}
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          style={{ background: sheenBg }}
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      )}

      <div className={`relative ${aspectClass} overflow-hidden bg-[#F1ECE2]`}>
        <Link
          to={`/artwork/${artwork.id}`}
          aria-label={`View details for ${artwork.title}`}
          className="block w-full h-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#9E7B3B]"
        >
          <div
            className={`w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              shouldReduceMotion ? '' : 'group-hover:scale-[1.05]'
            }`}
          >
            <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} />
          </div>
        </Link>

        {/* Save / Bookmark button with spring pop */}
        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.06 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.86 }}
          onClick={(e) => {
            e.preventDefault();
            toggleSaveArtwork(artwork.id);
          }}
          aria-label={
            isSaved ? 'Remove from saved collection' : 'Save to collection'
          }
          aria-pressed={isSaved}
          className={`absolute top-3.5 right-3.5 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#9E7B3B] ${
            isSaved
              ? 'bg-[#141312] text-[#E6C98F] shadow-md'
              : 'bg-[#FAF8F3]/90 text-[#141312] hover:bg-white'
          }`}
        >
          <motion.span
            key={isSaved ? 'saved' : 'unsaved'}
            initial={shouldReduceMotion ? false : { scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#E6C98F]' : ''}`} />
          </motion.span>
        </motion.button>

        {/* Dynamic Quick-Action Drawer sliding up on hover */}
        <div
          className={`absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2 p-2 rounded-xl bg-[#141312]/88 backdrop-blur-md text-[#FAF8F3] transition-all duration-200 ${
            shouldReduceMotion
              ? 'opacity-0 group-hover:opacity-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus-within:opacity-100 focus-within:translate-y-0'
          }`}
        >
          <Link
            to={`/artwork/${artwork.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors whitespace-nowrap"
          >
            <span>Inspect Plate</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleQuickInquire}
            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-lg bg-[#B38B40] text-[#141312] hover:bg-[#C69D4E] transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Inquire</span>
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4 relative z-10">
        <div className="space-y-1.5">
          {/* Unboxed clean metadata kicker */}
          <div className="flex items-center gap-1.5 text-xs text-[#787066]">
            <span>{formatCategoryLabel(artwork.category)}</span>
            <span aria-hidden="true">·</span>
            <span>{artwork.year}</span>
            {artwork.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span>Demo Listing</span>
              </>
            )}
          </div>

          <h3 className="font-serif text-xl sm:text-[1.35rem] font-semibold text-[#141312] leading-snug">
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
                className="hover:underline hover:text-[#141312] transition-colors"
              >
                {artist.fullName}
              </Link>
            </p>
          )}

          <p className="text-xs text-[#787066] line-clamp-1">
            {artwork.medium} · {artwork.dimensions}
          </p>
        </div>

        <div className="pt-3.5 border-t border-[#EFEAE0] flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-base font-medium text-[#141312] tabular-nums">
              {formatMoney(artwork.price, artwork.currency)}{' '}
              <span className="text-xs text-[#787066]">{artwork.currency}</span>
            </p>
            <p className="text-xs text-[#6B655E] mt-0.5">
              {formatAvailabilityLabel(artwork.availability)} ·{' '}
              {formatSaleModeLabel(artwork.saleMode)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleQuickInquire}
              className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#F3EFE6] text-[#141312] hover:bg-[#E6DFD1] whitespace-nowrap transition-colors"
            >
              <MessageSquare className="w-3 h-3 text-[#9E7B3B]" />
              <span>Inquire</span>
            </button>
            <Link
              to={`/artwork/${artwork.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9E7B3B] group-hover:text-[#141312] whitespace-nowrap shrink-0 py-1 transition-colors"
            >
              <span>Details</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
