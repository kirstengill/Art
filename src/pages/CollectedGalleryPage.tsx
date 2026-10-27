import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Grid3x3, LayoutGrid, RefreshCw } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkGrid } from '../components/artwork/ArtworkGrid';
import { ArtworkCard } from '../components/artwork/ArtworkCard';
import { ArtworkGridSkeleton } from '../components/ui/Skeletons';
import { formatMoney } from '../utils/formatters';
import type { Artwork, Purchase } from '../types/artverse';

interface CollectedArtwork extends Artwork {
  purchase: Purchase;
}

export const CollectedGalleryPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const {
    artworks,
    getArtworkById,
    currentUser,
    authMode,
  } = useArtVerse();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasedArtworks, setPurchasedArtworks] = useState<CollectedArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchases = async () => {
      if (authMode !== 'authenticated' || !currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch purchases from the API
        const response = await fetch('/api/purchases', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load purchases');
        }

        const data = await response.json();
        setPurchases(data.purchases || []);
        
        // Combine purchases with artwork data
        const combined = data.purchases.map((purchase: Purchase) => {
          const artwork = getArtworkById(purchase.artworkId);
          if (artwork) {
            return { ...artwork, purchase };
          }
          return null;
        }).filter(Boolean) as CollectedArtwork[];

        setPurchasedArtworks(combined);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your collection');
        console.error('Failed to load purchases:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadPurchases();
  }, [authMode, currentUser, getArtworkById]);

  const totalSpent = purchasedArtworks.reduce(
    (sum, item) => sum + (item.purchase?.purchasePrice || item.price),
    0
  );

  if (!currentUser || currentUser.role !== 'collector') {
    return (
      <div className="max-w-[1380px] mx-auto px-5 sm:px-8 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[#141312]">
          Collector Gallery Not Available
        </h1>
        <p className="text-sm text-[#575048]">
          This feature is only available to Collector accounts.
        </p>
        {authMode === 'guest' ? (
          <>
            <p className="text-sm text-[#575048]">
              Please sign in with a Collector account to view your collection.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl"
            >
              Sign In
            </Link>
          </>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-[#B38B40] text-[#FAF8F3] rounded-xl"
          >
            Return Home
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="w-full relative isolate">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(250, 248, 243, 0.96) 0%, rgba(247, 243, 237, 0.98) 100%)',
        }}
      />
      <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-6 sm:py-8 lg:py-12">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#575048] hover:text-[#141312] mb-6 sm:mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Gallery
        </Link>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] uppercase text-[#787066]">
                Your Personal Collection
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] mt-1">
                Collected Artworks
              </h1>
              <p className="text-sm text-[#575048] mt-2 max-w-xl">
                View all the pieces you've acquired. Your collection reflects your taste and the artists you support.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6B655E]">Total Spent</p>
              <p className="font-mono text-xl font-semibold text-[#141312] tabular-nums">
                {formatMoney(totalSpent, 'USD')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B655E]">
            <div className="flex items-center gap-3">
              <p className="tabular-nums">
                {loading
                  ? 'Loading your collection...'
                  : `Showing ${purchasedArtworks.length} ${purchasedArtworks.length === 1 ? 'artwork' : 'artworks'}`}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1 text-[#787066] hover:text-[#141312] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-4 rounded-xl border border-red-300/40 bg-red-950/10 text-sm text-red-600">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pt-10"
              >
                <ArtworkGridSkeleton
                  count={6}
                  columnsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7"
                  aspectClass="aspect-[4/5]"
                />
              </motion.div>
            ) : purchasedArtworks.length === 0 ? (
              <motion.div
                key="empty"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-20 text-center max-w-md mx-auto space-y-4"
              >
                <h2 className="font-serif text-2xl font-semibold text-[#141312]">
                  Your Collection is Empty
                </h2>
                <p className="text-sm text-[#575048]">
                  You haven't purchased any artworks yet. Browse the gallery to find pieces that speak to you.
                </p>
                <Link
                  to="/gallery"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-[#B38B40] text-[#FAF8F3] rounded-xl"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Browse Gallery
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-10"
              >
                <ArtworkGrid>
                  <AnimatePresence mode="popLayout">
                    {purchasedArtworks.map((art, index) => (
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
                        <ArtworkCard artwork={art} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ArtworkGrid>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
