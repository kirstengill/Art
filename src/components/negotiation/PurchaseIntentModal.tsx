import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import type { Artwork, OrderIntent } from '../../types/artverse';
import { ArtworkImage } from '../../data/artworkImages';
import { formatMoney } from '../../utils/formatters';
import { getWhatsAppHelplineUrl } from '../../utils/helpline';

interface PurchaseIntentModalProps {
  artwork: Artwork;
  agreedAmount?: number;
  offerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateIntent: (params: {
    artworkId: string;
    offerId?: string;
    shippingCity: string;
    collectorNote: string;
  }) => Promise<OrderIntent>;
}

export const PurchaseIntentModal: React.FC<PurchaseIntentModalProps> = ({
  artwork,
  agreedAmount,
  offerId,
  isOpen,
  onClose,
  onCreateIntent,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [shippingCity, setShippingCity] = useState('Zurich, Switzerland');
  const [collectorNote, setCollectorNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderIntent | null>(null);

  const unitAmount = agreedAmount ?? artwork.price;
  const cratingEstimate = Math.max(180, Math.round(unitAmount * 0.035));
  const whatsappUrl = createdOrder
    ? getWhatsAppHelplineUrl(
        `Artivora purchase inquiry ${createdOrder.id}: ${artwork.title}`
      )
    : undefined;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCreatedOrder(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleConfirmIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingCity.trim()) {
      setError('Please enter your destination city and country for crating estimation.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const order = await onCreateIntent({
        artworkId: artwork.id,
        offerId,
        shippingCity,
        collectorNote,
      });
      setCreatedOrder(order);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to register purchase intent.'
      );
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
          aria-labelledby="purchase-intent-heading"
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
                id="purchase-intent-heading"
                className="font-serif text-xl sm:text-2xl font-semibold text-[#141312]"
              >
                Acquisition Checkout Preview
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close acquisition preview"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5C554C] hover:bg-[#EFEAE0] hover:text-[#141312] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {createdOrder ? (
                <motion.div
                  key="confirmed"
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll"
                >
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F3EFE6] border border-[#DFD7C5]">
                    <CheckCircle2 className="w-5 h-5 text-[#B38B40] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-serif text-lg font-semibold text-[#141312]">
                        Purchase Intent Recorded — Payment Not Yet Collected
                      </h3>
                      <p className="text-xs text-[#5C554C] leading-relaxed">
                        Reference <span className="font-mono">{createdOrder.id}</span> has
                        been created with status{' '}
                        <span className="font-mono font-medium text-[#141312]">
                          awaiting_payment
                        </span>
                        . No payment has been processed. The administrator mediates next
                        steps; payment collection and delivery verification are not configured.
                      </p>
                    </div>
                  </div>

                  <dl className="divide-y divide-[#E6DFD3] text-sm">
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-[#6B655E]">Artwork</dt>
                      <dd className="font-medium text-[#141312]">{artwork.title}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-[#6B655E]">Agreed Artwork Price</dt>
                      <dd className="font-mono tabular-nums text-[#141312]">
                        {formatMoney(createdOrder.amount, createdOrder.currency)}{' '}
                        {createdOrder.currency}
                      </dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-[#6B655E]">Destination</dt>
                      <dd className="text-[#141312]">{createdOrder.shippingCity}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <dt className="text-[#6B655E]">Payment Status</dt>
                      <dd className="font-mono text-xs text-[#8C6828]">
                        Unpaid · Checkout Preview Only
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-4 text-xs leading-relaxed text-[#4F473D]">
                    The intended commission is 20% for Artivora and 80% for the artist.
                    Artist payouts are intended only after delivery is confirmed. These
                    steps are not automated or payment-enabled.
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex font-medium text-[#76551F] underline underline-offset-2"
                      >
                        Contact the Artivora administrator on WhatsApp
                      </a>
                    ) : (
                      <p className="mt-2 text-[#6B655E]">
                        The WhatsApp helpline is not configured for this deployment.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 text-sm font-medium bg-[#E6DFD3] text-[#141312] rounded-xl hover:bg-[#D8D0C4] transition-colors"
                    >
                      Return to Artwork
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleConfirmIntent}
                  className="p-5 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll"
                >
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F5EFE2] border border-[#E2D6BD] text-xs text-[#4F473D]">
                    <ShieldAlert className="w-4 h-4 text-[#B38B40] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Checkout Preview Notice:</strong> Live card and wire payment
                      processing is not yet connected. Submitting this form registers a
                      non-binding <strong>Purchase Intent</strong> without charging any
                      payment method.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pb-4 border-b border-[#E6DFD3]">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#E6DFD3]">
                      <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-semibold text-[#141312] truncate">
                        {artwork.title}
                      </p>
                      <p className="text-xs text-[#6B655E]">
                        {artwork.medium} · {artwork.dimensions}
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-2 text-sm pb-4 border-b border-[#E6DFD3]">
                    <div className="flex justify-between">
                      <dt className="text-[#6B655E]">
                        {agreedAmount ? 'Accepted Offer Price' : 'Gallery Listed Price'}
                      </dt>
                      <dd className="font-mono tabular-nums text-[#141312]">
                        {formatMoney(unitAmount, artwork.currency)} {artwork.currency}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6B655E]">
                        Estimated Museum Crating & Transit Insurance
                      </dt>
                      <dd className="font-mono tabular-nums text-[#5C554C]">
                        {formatMoney(cratingEstimate, artwork.currency)}{' '}
                        {artwork.currency}
                      </dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#ECE6DA] font-medium">
                      <dt className="text-[#141312]">Estimated Total (Unpaid Preview)</dt>
                      <dd className="font-mono tabular-nums text-[#141312]">
                        {formatMoney(unitAmount + cratingEstimate, artwork.currency)}{' '}
                        {artwork.currency}
                      </dd>
                    </div>
                  </dl>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="shipping-city-input"
                      className="block text-xs font-medium text-[#3B352F]"
                    >
                      Delivery City & Country
                    </label>
                    <input
                      id="shipping-city-input"
                      type="text"
                      required
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      placeholder="e.g., Geneva, Switzerland"
                      className="w-full px-4 py-2.5 bg-white border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="collector-note-input"
                      className="block text-xs font-medium text-[#3B352F]"
                    >
                      Acquisition & Framing Notes (Optional)
                    </label>
                    <textarea
                      id="collector-note-input"
                      rows={2}
                      value={collectorNote}
                      onChange={(e) => setCollectorNote(e.target.value)}
                      placeholder="Preferred courier window or Certificate of Authenticity instructions..."
                      className="w-full px-4 py-2.5 bg-white border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
                    />
                  </div>

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
                      className="px-5 py-2.5 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#2A2724] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      {submitting ? 'Recording Intent...' : 'Register Purchase Intent'}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
