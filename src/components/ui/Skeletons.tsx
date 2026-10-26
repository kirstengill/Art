import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface SkeletonBoneProps {
  className?: string;
}

export const SkeletonBone: React.FC<SkeletonBoneProps> = ({ className = '' }) => (
  <div aria-hidden="true" className={`artverse-skeleton ${className}`} />
);

interface ArtworkCardSkeletonProps {
  aspectClass?: string;
}

export const ArtworkCardSkeleton: React.FC<ArtworkCardSkeletonProps> = ({
  aspectClass = 'aspect-[4/5]',
}) => {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden"
    >
      {/* Artwork plate frame */}
      <div className={`relative ${aspectClass} bg-[#EFEAE0]`}>
        <SkeletonBone className="w-full h-full" />
        <div className="absolute top-3.5 right-3.5 w-10 h-10 rounded-full bg-[#FAF8F3]/85 border border-[#E6DFD3]" />
      </div>

      {/* Metadata & pricing body matching ArtworkCard 1:1 */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <SkeletonBone className="h-3 w-16 rounded-md" />
            <SkeletonBone className="h-3 w-10 rounded-md" />
          </div>
          <SkeletonBone className="h-6 w-4/5 rounded-md" />
          <SkeletonBone className="h-4 w-2/5 rounded-md" />
          <SkeletonBone className="h-3 w-3/5 rounded-md" />
        </div>

        <div className="pt-3.5 border-t border-[#EFEAE0] flex items-end justify-between gap-3">
          <div className="space-y-1.5">
            <SkeletonBone className="h-5 w-24 rounded-md" />
            <SkeletonBone className="h-3 w-32 rounded-md" />
          </div>
          <SkeletonBone className="h-4 w-14 rounded-md" />
        </div>
      </div>
    </div>
  );
};

interface ArtworkGridSkeletonProps {
  count?: number;
  columnsClass?: string;
  aspectClass?: string;
}

export const ArtworkGridSkeleton: React.FC<ArtworkGridSkeletonProps> = ({
  count = 6,
  columnsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7',
  aspectClass = 'aspect-[4/5]',
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-busy="true"
      aria-label="Loading catalogue artworks"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`grid ${columnsClass}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <ArtworkCardSkeleton key={idx} aspectClass={aspectClass} />
      ))}
      <span className="sr-only">Loading artworks...</span>
    </motion.div>
  );
};

export const InboxThreadListSkeleton: React.FC<{ count?: number }> = ({
  count = 5,
}) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading conversation inbox"
      className="p-2 space-y-1.5"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`p-3.5 rounded-xl flex items-start gap-3 ${
            idx === 0 ? 'bg-[#F3EFE6]/70 border border-[#E6DFD3]' : ''
          }`}
        >
          <SkeletonBone className="w-12 h-12 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <SkeletonBone className="h-4 w-3/5 rounded-md" />
              <SkeletonBone className="h-3 w-8 rounded-md" />
            </div>
            <SkeletonBone className="h-3 w-2/5 rounded-md" />
            <SkeletonBone className="h-3 w-4/5 rounded-md" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading conversation threads...</span>
    </div>
  );
};

export const ConversationMessagesSkeleton: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-busy="true"
      aria-label="Loading conversation messages"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="flex-1 flex flex-col min-h-[540px]"
    >
      {/* Header Skeleton */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#E6DFD3] bg-[#FAF8F3]/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SkeletonBone className="w-9 h-9 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBone className="h-4 w-44 rounded-md" />
            <SkeletonBone className="h-3 w-56 rounded-md" />
          </div>
        </div>
        <SkeletonBone className="lg:hidden h-8 w-24 rounded-lg" />
      </div>

      {/* Alternating Message Bubbles & Offer Event Skeleton */}
      <div className="flex-1 p-5 sm:p-6 space-y-5 bg-[#FCFBF8]">
        {/* Incoming message */}
        <div className="flex flex-col items-start space-y-1.5">
          <SkeletonBone className="h-2.5 w-32 rounded" />
          <div className="w-[74%] sm:w-[64%] rounded-2xl rounded-bl-md bg-white border border-[#E6DFD3] p-4 space-y-2">
            <SkeletonBone className="h-3.5 w-full rounded" />
            <SkeletonBone className="h-3.5 w-4/5 rounded" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex flex-col items-end space-y-1.5">
          <SkeletonBone className="h-2.5 w-28 rounded" />
          <div className="w-[68%] sm:w-[56%] rounded-2xl rounded-br-md bg-[#EFEAE0] p-4 space-y-2">
            <SkeletonBone className="h-3.5 w-full rounded" />
            <SkeletonBone className="h-3.5 w-2/3 rounded" />
          </div>
        </div>

        {/* Centered negotiation record card */}
        <div className="my-2 mx-auto max-w-sm p-4 rounded-xl bg-[#F4EFE4] border border-[#E2D9C8] flex flex-col items-center space-y-2">
          <SkeletonBone className="h-2.5 w-36 rounded" />
          <SkeletonBone className="h-3.5 w-60 rounded" />
          <SkeletonBone className="h-2.5 w-20 rounded" />
        </div>

        {/* Follow-up incoming message */}
        <div className="flex flex-col items-start space-y-1.5">
          <SkeletonBone className="h-2.5 w-32 rounded" />
          <div className="w-[70%] sm:w-[58%] rounded-2xl rounded-bl-md bg-white border border-[#E6DFD3] p-4 space-y-2">
            <SkeletonBone className="h-3.5 w-11/12 rounded" />
            <SkeletonBone className="h-3.5 w-3/5 rounded" />
          </div>
        </div>
      </div>

      {/* Composer Bar Skeleton */}
      <div className="p-4 bg-white border-t border-[#E6DFD3] flex items-center gap-2">
        <SkeletonBone className="w-10 h-10 rounded-xl shrink-0" />
        <SkeletonBone className="h-10 flex-1 rounded-xl" />
        <SkeletonBone className="h-10 w-20 rounded-xl shrink-0" />
      </div>
      <span className="sr-only">Loading active conversation...</span>
    </motion.div>
  );
};

export const NegotiationDossierSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading artwork negotiation terms"
      className="space-y-6"
    >
      {/* Linked Lot Summary */}
      <div className="space-y-3.5 pb-5 border-b border-[#E6DFD3]">
        <SkeletonBone className="h-3 w-28 rounded" />
        <div className="flex items-center gap-3.5">
          <SkeletonBone className="w-16 h-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBone className="h-5 w-4/5 rounded-md" />
            <SkeletonBone className="h-3 w-3/5 rounded-md" />
            <SkeletonBone className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
        <div className="pt-2 space-y-2">
          <div className="flex justify-between">
            <SkeletonBone className="h-3 w-28 rounded" />
            <SkeletonBone className="h-3 w-20 rounded" />
          </div>
          <div className="flex justify-between">
            <SkeletonBone className="h-3 w-20 rounded" />
            <SkeletonBone className="h-3 w-24 rounded" />
          </div>
          <div className="flex justify-between">
            <SkeletonBone className="h-3 w-24 rounded" />
            <SkeletonBone className="h-3 w-24 rounded" />
          </div>
        </div>
      </div>

      {/* Offer Standing Box */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBone className="h-5 w-28 rounded-md" />
          <SkeletonBone className="h-3.5 w-16 rounded-md" />
        </div>
        <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E6DFD3] space-y-3">
          <div className="flex items-baseline justify-between">
            <SkeletonBone className="h-3 w-28 rounded" />
            <SkeletonBone className="h-6 w-24 rounded-md" />
          </div>
          <SkeletonBone className="h-3 w-40 rounded" />
          <SkeletonBone className="h-9 w-full rounded-lg" />
        </div>
      </div>

      {/* Negotiation Timeline */}
      <div className="pt-5 border-t border-[#E6DFD3] space-y-3">
        <SkeletonBone className="h-5 w-36 rounded-md" />
        {[1, 2].map((item) => (
          <div
            key={item}
            className="pb-3 border-b last:border-b-0 border-[#ECE6DA] space-y-2"
          >
            <div className="flex justify-between">
              <SkeletonBone className="h-3.5 w-28 rounded" />
              <SkeletonBone className="h-3.5 w-20 rounded" />
            </div>
            <div className="flex justify-between">
              <SkeletonBone className="h-3 w-16 rounded" />
              <SkeletonBone className="h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading negotiation terms...</span>
    </div>
  );
};
