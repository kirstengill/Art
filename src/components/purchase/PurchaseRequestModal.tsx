import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, ShieldAlert, ShoppingBag, X } from 'lucide-react';
import type { ArtistProfile, Artwork, PurchaseRequestReceipt } from '../../types/artverse';
import { useArtVerse } from '../../context/ArtVerseContext';
import { ArtworkImage } from '../../data/artworkImages';
import { artverseApi } from '../../services/artverseApi';
import { formatMoney, formatShortDate } from '../../utils/formatters';
import { isArtworkDirectlyPurchasable } from '../../utils/purchaseRequests';

interface PurchaseRequestModalProps {
  artwork: Artwork;
  artist?: ArtistProfile;
  isOpen: boolean;
  onClose: () => void;
}

function createRequestId(): string {
  return crypto.randomUUID();
}

export const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({
  artwork,
  artist,
  isOpen,
  onClose,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const id = useId();
  const { currentUser } = useArtVerse();
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [requestId, setRequestId] = useState(createRequestId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<PurchaseRequestReceipt | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setBuyerName(currentUser?.fullName || '');
    setBuyerEmail(currentUser?.email || '');
    setBuyerPhone('');
    setDeliveryLocation('');
    setDeliveryAddress('');
    setInstructions('');
    setRequestId(createRequestId());
    setError(null);
    setCreatedOrder(null);
  }, [currentUser?.email, currentUser?.fullName, isOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, submitting]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || createdOrder) return;
    setError(null);
    setSubmitting(true);
    try {
      const { order } = await artverseApi.createPurchaseRequest({
        requestId,
        artworkId: artwork.id,
        buyerName,
        buyerPhone,
        buyerEmail,
        deliveryLocation,
        deliveryAddress,
        instructions,
      });
      setCreatedOrder(order);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit your purchase request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isArtworkDirectlyPurchasable(artwork.availability, artwork.saleMode)) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) onClose();
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#141312]/70 p-3 backdrop-blur-[3px] sm:p-4"
        >
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-heading`}
            className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#DFD8CA] bg-[#FAF8F3] shadow-xl sm:max-h-[90dvh]"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E6DFD3] px-5 py-4 sm:px-6">
              <h2 id={`${id}-heading`} className="font-serif text-xl font-semibold text-[#141312] sm:text-2xl">
                Purchase Request
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close purchase request"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#5C554C] transition-colors hover:bg-[#EFEAE0] hover:text-[#141312] disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdOrder ? (
              <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
                <div className="flex items-start gap-3 rounded-xl border border-[#DFD7C5] bg-[#F3EFE6] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#9E7B3B]" />
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-semibold text-[#141312]">
                      Request received
                    </h3>
                    <p className="text-sm leading-relaxed text-[#5C554C]">
                      The Artivora administrator will review your request and coordinate
                      the next steps with you. No payment has been taken and this request
                      does not reserve or mark the artwork as sold.
                    </p>
                  </div>
                </div>
                <dl className="divide-y divide-[#E6DFD3] text-sm">
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-[#6B655E]">Reference</dt>
                    <dd className="font-mono text-[#141312]">{createdOrder.id}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-[#6B655E]">Artwork</dt>
                    <dd className="text-right font-medium text-[#141312]">{artwork.title}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-[#6B655E]">Listed price</dt>
                    <dd className="font-mono tabular-nums text-[#141312]">
                      {formatMoney(createdOrder.amount, createdOrder.currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-[#6B655E]">Status</dt>
                    <dd className="capitalize text-[#141312]">{createdOrder.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-[#6B655E]">Received</dt>
                    <dd className="text-[#141312]">
                      {formatShortDate(createdOrder.createdAt)}{' '}
                      {new Date(createdOrder.createdAt).toLocaleTimeString()}
                    </dd>
                  </div>
                </dl>
                <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-4 text-xs leading-relaxed text-[#4F473D]">
                  Artivora’s intended split is 20% platform and 80% artist, with artist
                  payout only after delivery confirmation. Payment collection, delivery
                  verification, and payouts remain administrator-managed and are not
                  automated.
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-[#141312] px-5 py-2.5 text-sm font-medium text-[#FAF8F3] hover:bg-[#2A2724]"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-5 sm:p-6">
                <div className="flex items-start gap-4 rounded-xl border border-[#E6DFD3] bg-white p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    <ArtworkImage imageKey={artwork.imageKey} alt={artwork.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-lg font-semibold text-[#141312]">{artwork.title}</h3>
                    <p className="mt-0.5 text-sm text-[#6B655E]">
                      {artist?.fullName || 'Artivora Artist'}
                      {artist?.handle ? ` · @${artist.handle}` : ''}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#8C6828]">
                      {formatMoney(artwork.price, artwork.currency)}{' '}
                      <span className="text-xs">{artwork.currency}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-3.5 text-xs leading-relaxed text-[#4F473D]">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#9E7B3B]" />
                  <p>
                    This submits a request to the Artivora administrator only. It is not
                    a payment, does not contact the artist directly, and does not mark
                    the artwork as sold.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor={`${id}-buyer-name`} className="block text-xs font-medium text-[#3B352F]">
                      Full name <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id={`${id}-buyer-name`}
                      name="buyerName"
                      autoComplete="name"
                      required
                      maxLength={120}
                      value={buyerName}
                      onChange={(event) => setBuyerName(event.target.value)}
                      className="w-full rounded-xl border border-[#D8D0C1] bg-white px-3.5 py-2.5 text-sm text-[#141312] focus:border-[#B38B40] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`${id}-buyer-phone`} className="block text-xs font-medium text-[#3B352F]">
                      Phone or WhatsApp <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id={`${id}-buyer-phone`}
                      name="buyerPhone"
                      type="tel"
                      autoComplete="tel"
                      required
                      maxLength={40}
                      value={buyerPhone}
                      onChange={(event) => setBuyerPhone(event.target.value)}
                      className="w-full rounded-xl border border-[#D8D0C1] bg-white px-3.5 py-2.5 text-sm text-[#141312] focus:border-[#B38B40] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor={`${id}-buyer-email`} className="block text-xs font-medium text-[#3B352F]">
                      Email address <span className="text-[#787066]">(optional)</span>
                    </label>
                    <input
                      id={`${id}-buyer-email`}
                      name="buyerEmail"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={buyerEmail}
                      onChange={(event) => setBuyerEmail(event.target.value)}
                      className="w-full rounded-xl border border-[#D8D0C1] bg-white px-3.5 py-2.5 text-sm text-[#141312] focus:border-[#B38B40] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor={`${id}-delivery-location`} className="block text-xs font-medium text-[#3B352F]">
                      Delivery location <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id={`${id}-delivery-location`}
                      name="deliveryLocation"
                      autoComplete="address-level2"
                      required
                      maxLength={160}
                      value={deliveryLocation}
                      onChange={(event) => setDeliveryLocation(event.target.value)}
                      placeholder="City, country"
                      className="w-full rounded-xl border border-[#D8D0C1] bg-white px-3.5 py-2.5 text-sm text-[#141312] focus:border-[#B38B40] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor={`${id}-delivery-address`} className="block text-xs font-medium text-[#3B352F]">
                      Full delivery address <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id={`${id}-delivery-address`}
                      name="deliveryAddress"
                      autoComplete="street-address"
                      required
                      minLength={5}
                      maxLength={500}
                      rows={3}
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                      className="w-full resize-y rounded-xl border border-[#D8D0C1] bg-white px-3.5 py-2.5 text-sm text-[#141312] focus:border-[#B38B40] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor={`${id}-instructions`} className="block text-xs font-medium text-[#3B352F]">
                      Additional instructions <span className="text-[#787066]">(optional)</span>
                    </label>
                    <textarea
                      id={`${id}-instructions`}
                      name="instructions"
                      maxLength={2000}
                      rows={2}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      className="w-full resize-y rounded-xl border border-[#D8D0C1] bg-white px-3.5 py-2.5 text-sm text-[#141312] focus:border-[#B38B40] focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#992E24]">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#E6DFD3] pt-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-[#6B655E]">
                    Listed price: <strong className="font-mono text-[#141312]">{formatMoney(artwork.price, artwork.currency)} {artwork.currency}</strong>
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#3B352F] hover:bg-[#EFEAE0] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#141312] px-5 py-2.5 text-sm font-medium text-[#FAF8F3] transition-colors hover:bg-[#2A2724] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {submitting ? 'Submitting…' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
