import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import type { Artwork } from '../../types/artverse';
import { ArtworkImage } from '../../data/artworkImages';
import { formatMoney } from '../../utils/formatters';

interface MakeOfferModalProps {
  artwork: Artwork;
  isOpen: boolean;
  onClose: () => void;
  onSubmitOffer: (payload: {
    amount: number;
    currency: string;
    note: string;
  }) => Promise<void>;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  artwork,
  isOpen,
  onClose,
  onSubmitOffer,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const suggestedInitial = Math.round(artwork.price * 0.9);
  const [amount, setAmount] = useState<string>(String(suggestedInitial));
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(String(Math.round(artwork.price * 0.9)));
      setNote('');
      setError(null);
    }
  }, [artwork.price, isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Please enter a valid positive offer amount.');
      return;
    }
    if (numeric < Math.round(artwork.price * 0.4)) {
      setError(
        `Gallery minimum private offer threshold is 40% of asking price (${formatMoney(
          Math.round(artwork.price * 0.4),
          artwork.currency
        )}).`
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmitOffer({
        amount: Math.round(numeric),
        currency: artwork.currency,
        note,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="make-offer-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-[#141312]/65 backdrop-blur-[3px]"
        >
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[88dvh] flex flex-col bg-[#FAF8F3] border border-[#DFD8CA] rounded-2xl shadow-xl overflow-hidden my-auto"
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E6DFD3] shrink-0">
              <h2
                id="make-offer-heading"
                className="font-serif text-xl sm:text-2xl font-semibold text-[#141312]"
              >
                Submit Private Collector Offer
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close offer modal"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5C554C] hover:bg-[#EFEAE0] hover:text-[#141312] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll"
            >
              <div className="flex items-center gap-4 pb-4 border-b border-[#E6DFD3]">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#E6DFD3]">
                  <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold text-[#141312] truncate">
                    {artwork.title}
                  </p>
                  <p className="text-xs text-[#6B655E]">
                    Listed Asking Price:{' '}
                    <span className="font-mono font-medium text-[#141312] tabular-nums">
                      {formatMoney(artwork.price, artwork.currency)} {artwork.currency}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="offer-amount-input"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Proposed Offer Amount ({artwork.currency})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-[#7A7267]">
                    $
                  </span>
                  <input
                    id="offer-amount-input"
                    type="number"
                    min={1}
                    step={50}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-16 py-2.5 bg-white border border-[#D8D0C1] rounded-xl font-mono text-base text-[#141312] tabular-nums focus:outline-none focus:border-[#B38B40] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-[#7A7267]">
                    {artwork.currency}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {[0.85, 0.9, 0.95].map((ratio) => {
                    const preset = Math.round(artwork.price * ratio);
                    const isSelected = Number(amount) === preset;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className={`px-3 py-1.5 text-xs font-mono tabular-nums rounded-lg transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#141312] text-[#FAF8F3]'
                            : 'bg-[#EFEAE0] hover:bg-[#E5DEC9] text-[#3B352F]'
                        }`}
                      >
                        {formatMoney(preset, artwork.currency)} ({Math.round(ratio * 100)}%)
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="offer-note-input"
                  className="block text-xs font-medium text-[#3B352F]"
                >
                  Note to the Artist (Optional)
                </label>
                <textarea
                  id="offer-note-input"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Share framing preferences, delivery city, or acquisition timeline..."
                  className="w-full px-4 py-2.5 bg-white border border-[#D8D0C1] rounded-xl text-sm text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                />
              </div>

              <p className="text-xs text-[#6B655E] leading-relaxed">
                Submitting an offer opens or updates your artwork-linked negotiation thread.
                Accepting an offer reserves the work and generates an unpaid settlement
                preview; no payment is charged automatically.
              </p>

              {error && (
                <p role="alert" className="text-xs font-medium text-[#992E24]">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-[#3B352F] hover:bg-[#EFEAE0] rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  className="px-5 py-2.5 text-sm font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {submitting ? 'Submitting Offer...' : 'Send Formal Offer'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
