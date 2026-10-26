import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { ArtworkImage, ProfileAvatar } from '../data/artworkImages';
import { PurchaseIntentModal } from '../components/negotiation/PurchaseIntentModal';
import {
  ConversationMessagesSkeleton,
  InboxThreadListSkeleton,
  NegotiationDossierSkeleton,
} from '../components/ui/Skeletons';
import {
  formatMoney,
  formatOfferStatusLabel,
  formatSaleModeLabel,
  formatTimeStamp,
} from '../utils/formatters';

const SAMPLE_ATTACHMENTS = [
  'Studio_Condition_Report.pdf',
  'Raking_Light_Detail_Plate.jpg',
  'Museum_Crating_Dimensions.pdf',
];

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const MessagesPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    conversations,
    messages,
    offers,
    currentUser,
    authMode,
    isLoadingThreads,
    refreshConversations,
    getArtworkById,
    getProfileById,
    sendMessage,
    makeOffer,
    respondToOffer,
    createOrderIntent,
  } = useArtVerse();

  const paramConvId = searchParams.get('conv');
  const [selectedConvId, setSelectedConvId] = useState<string>(
    paramConvId || conversations[0]?.id || ''
  );
  const [inboxQuery, setInboxQuery] = useState('');
  const [mobileView, setMobileView] = useState<'inbox' | 'chat'>(
    paramConvId ? 'chat' : 'inbox'
  );
  const [mobileDossierOpen, setMobileDossierOpen] = useState(false);

  // In demo mode, allow testing both Collector and Artist sides of an offer negotiation
  const [demoPerspective, setDemoPerspective] = useState<'collector' | 'artist'>(
    currentUser?.role === 'artist' ? 'artist' : 'collector'
  );

  const [composerText, setComposerText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Offer & Counteroffer inline forms
  const [offerFormMode, setOfferFormMode] = useState<'none' | 'new' | 'counter'>('none');
  const [offerAmountInput, setOfferAmountInput] = useState('');
  const [offerNoteInput, setOfferNoteInput] = useState('');
  const [offerFormError, setOfferFormError] = useState<string | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [isSwitchingThread, setIsSwitchingThread] = useState(false);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const switchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paramConvId && conversations.some((c) => c.id === paramConvId)) {
      setSelectedConvId(paramConvId);
      setMobileView('chat');
    } else if (!selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, paramConvId, selectedConvId]);

  const filteredConversations = useMemo(() => {
    const q = inboxQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const art = getArtworkById(conv.artworkId);
      const artist = getProfileById(conv.artistId);
      const collector = getProfileById(conv.collectorId);
      return (
        art?.title.toLowerCase().includes(q) ||
        artist?.fullName.toLowerCase().includes(q) ||
        collector?.fullName.toLowerCase().includes(q) ||
        conv.lastMessagePreview.toLowerCase().includes(q)
      );
    });
  }, [conversations, getArtworkById, getProfileById, inboxQuery]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);
  const activeArtwork = activeConv ? getArtworkById(activeConv.artworkId) : undefined;
  const activeArtist = activeConv ? getProfileById(activeConv.artistId) : undefined;
  const activeCollector = activeConv
    ? getProfileById(activeConv.collectorId)
    : undefined;

  const activeMessages = useMemo(
    () => messages.filter((m) => m.conversationId === selectedConvId),
    [messages, selectedConvId]
  );

  const activeOffers = useMemo(
    () => offers.filter((o) => o.conversationId === selectedConvId),
    [offers, selectedConvId]
  );

  const latestOffer = activeOffers[activeOffers.length - 1];

  // Determine the active participant ID for message alignment and offer permissions
  const effectiveViewerId = useMemo(() => {
    if (!activeConv) return currentUser?.id || 'collector-julian-mercer';
    if (authMode === 'authenticated' && !activeConv.isDemo && currentUser) {
      return currentUser.id;
    }
    return demoPerspective === 'artist'
      ? activeConv.artistId
      : activeConv.collectorId;
  }, [activeConv, authMode, currentUser, demoPerspective]);

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  }, [activeMessages.length, selectedConvId, shouldReduceMotion]);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current);
      }
    };
  }, []);

  const handleSelectConversation = (convId: string) => {
    const isDifferent = convId !== selectedConvId;
    setSelectedConvId(convId);
    setSearchParams({ conv: convId }, { replace: true });
    setMobileView('chat');
    setOfferFormMode('none');
    setOfferFormError(null);

    if (isDifferent && !shouldReduceMotion) {
      if (switchTimerRef.current) {
        window.clearTimeout(switchTimerRef.current);
      }
      setIsSwitchingThread(true);
      switchTimerRef.current = window.setTimeout(() => {
        setIsSwitchingThread(false);
      }, 180);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || (!composerText.trim() && !selectedAttachment)) return;
    const text =
      composerText.trim() || `Shared attachment: ${selectedAttachment}`;
    await sendMessage(
      activeConv.id,
      text,
      selectedAttachment || undefined,
      effectiveViewerId
    );
    setComposerText('');
    setSelectedAttachment(null);
    setShowAttachmentMenu(false);
  };

  const openNewOfferForm = () => {
    if (!activeArtwork) return;
    setOfferAmountInput(String(Math.round(activeArtwork.price * 0.9)));
    setOfferNoteInput('');
    setOfferFormError(null);
    setOfferFormMode('new');
  };

  const openCounterOfferForm = () => {
    if (!latestOffer || !activeArtwork) return;
    const midPoint = Math.round((latestOffer.amount + activeArtwork.price) / 2);
    setOfferAmountInput(String(midPoint));
    setOfferNoteInput('');
    setOfferFormError(null);
    setOfferFormMode('counter');
  };

  const handleOfferFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !activeArtwork) return;
    const numeric = Number(offerAmountInput);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setOfferFormError('Enter a valid positive amount.');
      return;
    }

    setOfferFormError(null);
    try {
      if (offerFormMode === 'counter' && latestOffer) {
        await respondToOffer({
          offerId: latestOffer.id,
          action: 'counter',
          counterAmount: Math.round(numeric),
          note: offerNoteInput,
          overrideActorId: effectiveViewerId,
        });
      } else {
        await makeOffer({
          conversationId: activeConv.id,
          amount: Math.round(numeric),
          currency: activeArtwork.currency,
          note: offerNoteInput,
          overrideSenderId: effectiveViewerId,
        });
      }
      setOfferFormMode('none');
      setOfferNoteInput('');
    } catch (err) {
      setOfferFormError(
        err instanceof Error ? err.message : 'Unable to submit offer.'
      );
    }
  };

  const canMakeNewOffer =
    activeArtwork &&
    activeArtwork.saleMode !== 'buy_now' &&
    (!latestOffer ||
      ['rejected', 'withdrawn', 'expired'].includes(latestOffer.status));

  const canRespondToPending =
    latestOffer &&
    latestOffer.status === 'pending' &&
    latestOffer.recipientId === effectiveViewerId;

  const canWithdrawPending =
    latestOffer &&
    latestOffer.status === 'pending' &&
    latestOffer.senderId === effectiveViewerId;

  const renderNegotiationDossier = (idScope: string) => {
    if (!activeConv || !activeArtwork) return null;

    return (
      <div className="space-y-6">
        {/* Linked Artwork Summary */}
        <div className="space-y-3.5 pb-5 border-b border-[#E6DFD3]">
          <p className="text-xs font-medium tracking-wide text-[#8C6828]">
            Linked Catalogue Lot
          </p>
          <Link
            to={`/artwork/${activeArtwork.id}`}
            className="flex items-center gap-3.5 group p-2.5 -mx-2.5 rounded-xl hover:bg-[#FAF8F3] transition-colors"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E6DFD3] shrink-0">
              <ArtworkImage
                imageKey={activeArtwork.imageKey}
                alt={activeArtwork.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-serif text-lg font-semibold text-[#141312] group-hover:text-[#B38B40] transition-colors truncate">
                  {activeArtwork.title}
                </h3>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8C6828] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <p className="text-xs text-[#6B655E] truncate">
                {activeArtist?.fullName} · {activeArtwork.year}
              </p>
              <p className="text-xs text-[#7A7267]">
                {formatSaleModeLabel(activeArtwork.saleMode)}
              </p>
            </div>
          </Link>

          <dl className="pt-1 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-[#6B655E]">Original Asking Price</dt>
              <dd className="font-mono font-medium text-[#141312] tabular-nums">
                {formatMoney(activeArtwork.price, activeArtwork.currency)}{' '}
                {activeArtwork.currency}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B655E]">Collector</dt>
              <dd className="text-[#141312]">{activeCollector?.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B655E]">Artist Studio</dt>
              <dd className="text-[#141312]">{activeArtist?.fullName}</dd>
            </div>
          </dl>
        </div>

        {/* Demo Role Switcher with gliding spring pill */}
        {activeConv.isDemo && (
          <div className="p-3.5 rounded-xl bg-[#F3EFE6] border border-[#E6DFD3] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#3B352F]">
                Active Negotiation Perspective
              </span>
              <span className="text-[11px] text-[#7A7267]">Demo Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#E6DFD3]/80 rounded-lg relative">
              {(['collector', 'artist'] as const).map((side) => {
                const active = demoPerspective === side;
                const firstName =
                  side === 'collector'
                    ? activeCollector?.fullName.split(' ')[0]
                    : activeArtist?.fullName.split(' ')[0];
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      setDemoPerspective(side);
                      setOfferFormMode('none');
                    }}
                    className={`relative py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap z-10 ${
                      active
                        ? 'text-[#141312]'
                        : 'text-[#5C554C] hover:text-[#141312]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`perspective-pill-${idScope}`}
                        transition={{
                          type: 'spring',
                          stiffness: 480,
                          damping: 36,
                        }}
                        className="absolute inset-0 bg-white rounded-md shadow-xs -z-10"
                      />
                    )}
                    {side === 'collector' ? 'Collector' : 'Artist'} ({firstName})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Offer Status & Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-[#141312]">
              Offer Standing
            </h3>
            {latestOffer && (
              <span className="text-xs font-medium text-[#8C6828]">
                {formatOfferStatusLabel(latestOffer.status)}
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {latestOffer ? (
              <motion.div
                key={`${latestOffer.id}-${latestOffer.status}`}
                initial={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: 6, scale: 0.985 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E2D9C8] space-y-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#6B655E]">Latest Proposed Amount</span>
                  <span className="font-mono text-xl font-semibold text-[#141312] tabular-nums">
                    {formatMoney(latestOffer.amount, latestOffer.currency)}{' '}
                    <span className="text-xs font-normal text-[#7A7267]">
                      {latestOffer.currency}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-[#5C554C]">
                  From{' '}
                  <strong className="font-medium text-[#141312]">
                    {getProfileById(latestOffer.senderId)?.fullName}
                  </strong>{' '}
                  · {formatTimeStamp(latestOffer.createdAt)}
                </p>

                {latestOffer.note && (
                  <p className="text-xs italic text-[#4F4840] pt-2 border-t border-[#ECE6DA]">
                    “{latestOffer.note}”
                  </p>
                )}

                {/* Accepted Confirmation Banner */}
                {latestOffer.status === 'accepted' && (
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="mt-2 p-3.5 rounded-xl bg-[#F2ECE0] border border-[#D8C6A2] space-y-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#B38B40] shrink-0 mt-0.5" />
                      <div className="text-xs text-[#3B352F] leading-relaxed">
                        <strong>Offer Accepted.</strong> Artwork is reserved at{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(latestOffer.amount, latestOffer.currency)}
                        </span>
                        . Acceptance does not mark the order as paid—proceed to checkout
                        preview to generate an acquisition intent.
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                      onClick={() => setPurchaseModalOpen(true)}
                      className="w-full py-2.5 px-3 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-lg hover:bg-[#2A2724] transition-colors whitespace-nowrap"
                    >
                      Open Settlement Checkout Preview
                    </motion.button>
                  </motion.div>
                )}

                {/* Recipient Actions on Pending Offer */}
                {canRespondToPending && offerFormMode === 'none' && (
                  <div className="pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        type="button"
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        onClick={() =>
                          respondToOffer({
                            offerId: latestOffer.id,
                            action: 'accept',
                            overrideActorId: effectiveViewerId,
                          })
                        }
                        className="py-2 px-3 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-lg hover:bg-[#C69D4E] transition-colors whitespace-nowrap"
                      >
                        Accept Offer
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        onClick={openCounterOfferForm}
                        className="py-2 px-3 text-xs font-medium bg-[#141312] text-[#FAF8F3] rounded-lg hover:bg-[#2A2724] transition-colors whitespace-nowrap"
                      >
                        Counteroffer
                      </motion.button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        respondToOffer({
                          offerId: latestOffer.id,
                          action: 'reject',
                          overrideActorId: effectiveViewerId,
                        })
                      }
                      className="w-full py-2 px-3 text-xs font-medium bg-white border border-[#D8D0C1] text-[#5C554C] hover:text-[#992E24] hover:border-[#C99B95] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Decline Offer
                    </button>
                  </div>
                )}

                {/* Sender Withdraw Action on Pending Offer */}
                {canWithdrawPending && offerFormMode === 'none' && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] text-[#7A7267]">
                      Awaiting response from{' '}
                      {getProfileById(latestOffer.recipientId)?.fullName}.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        respondToOffer({
                          offerId: latestOffer.id,
                          action: 'withdraw',
                          overrideActorId: effectiveViewerId,
                        })
                      }
                      className="w-full py-2 px-3 text-xs font-medium bg-white border border-[#D8D0C1] text-[#3B352F] hover:border-[#B38B40] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Withdraw Pending Offer
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p
                key="empty-offer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-[#6B655E]"
              >
                No formal price offer has been submitted in this conversation yet.
              </motion.p>
            )}
          </AnimatePresence>

          {canMakeNewOffer && offerFormMode === 'none' && (
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              onClick={openNewOfferForm}
              className="w-full py-2.5 px-4 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] transition-colors whitespace-nowrap"
            >
              Make New Offer
            </motion.button>
          )}

          {/* Inline New Offer / Counteroffer Form */}
          <AnimatePresence>
            {offerFormMode !== 'none' && (
              <motion.form
                initial={
                  shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                onSubmit={handleOfferFormSubmit}
                className="p-4 rounded-xl bg-white border border-[#C9B07A] space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-base font-semibold text-[#141312]">
                    {offerFormMode === 'counter'
                      ? 'Propose Counteroffer'
                      : 'Submit Collector Offer'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setOfferFormMode('none')}
                    className="text-xs text-[#7A7267] hover:text-[#141312]"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label
                    htmlFor={`inline-offer-amount-${idScope}`}
                    className="block text-xs text-[#5C554C] mb-1"
                  >
                    Amount ({activeArtwork.currency})
                  </label>
                  <input
                    id={`inline-offer-amount-${idScope}`}
                    type="number"
                    min={1}
                    required
                    value={offerAmountInput}
                    onChange={(e) => setOfferAmountInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#D8D0C1] rounded-lg font-mono text-sm text-[#141312] tabular-nums focus:outline-none focus:border-[#B38B40]"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`inline-offer-note-${idScope}`}
                    className="block text-xs text-[#5C554C] mb-1"
                  >
                    Optional Note
                  </label>
                  <input
                    id={`inline-offer-note-${idScope}`}
                    type="text"
                    value={offerNoteInput}
                    onChange={(e) => setOfferNoteInput(e.target.value)}
                    placeholder="Crating, delivery schedule, or terms..."
                    className="w-full px-3 py-2 bg-[#FAF8F3] border border-[#D8D0C1] rounded-lg text-xs text-[#141312] focus:outline-none focus:border-[#B38B40]"
                  />
                </div>

                {offerFormError && (
                  <p role="alert" className="text-xs text-[#992E24]">
                    {offerFormError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-lg hover:bg-[#C69D4E] transition-colors whitespace-nowrap"
                >
                  {offerFormMode === 'counter'
                    ? 'Send Counteroffer'
                    : 'Submit Formal Offer'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Chronological Negotiation Timeline */}
        <div className="pt-5 border-t border-[#E6DFD3] space-y-3">
          <h4 className="font-serif text-lg font-semibold text-[#141312] tabular-nums">
            Negotiation History ({activeOffers.length})
          </h4>
          {activeOffers.length === 0 ? (
            <p className="text-xs text-[#7A7267]">
              Offer history will appear here once a proposal is submitted.
            </p>
          ) : (
            <ol className="space-y-3">
              {activeOffers.map((item, idx) => {
                const sender = getProfileById(item.senderId);
                return (
                  <motion.li
                    key={item.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="text-xs pb-3 last:pb-0 border-b last:border-b-0 border-[#ECE6DA] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#141312] tabular-nums">
                        #{idx + 1} · {sender?.fullName || 'Participant'}
                      </span>
                      <span className="font-mono font-medium text-[#141312] tabular-nums">
                        {formatMoney(item.amount, item.currency)} {item.currency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#7A7267]">
                      <span>{formatOfferStatusLabel(item.status)}</span>
                      <span>{formatTimeStamp(item.createdAt)}</span>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Clear Demo Messaging Disclosure Banner */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="mb-4 sm:mb-5 px-4 py-3 rounded-xl bg-[#F3EFE6] border border-[#E6DFD3] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C554C]"
        >
          <span>
            <strong className="text-[#141312]">Private Collector & Studio Desk:</strong>{' '}
            Every thread is linked to a specific catalogue work. Sample threads are local
            demo previews and are not transmitted to external people.
          </span>
          <Link
            to="/gallery"
            className="font-medium text-[#8C6828] hover:text-[#141312] transition-colors whitespace-nowrap"
          >
            Select Another Artwork →
          </Link>
        </motion.div>

        {/* 3-Column Desktop / Responsive Mobile Messaging Shell with bounded scrollable panes */}
        <div className="bg-white border border-[#E6DFD3] rounded-2xl shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100dvh-9.5rem)] min-h-[480px] max-h-[780px] lg:h-[calc(100dvh-10rem)] lg:min-h-[560px] lg:max-h-[840px]">
          {/* LEFT: Conversation Inbox */}
          <aside
            className={`lg:col-span-3 border-r border-[#E6DFD3] min-h-0 flex flex-col bg-[#FDFCFA] ${
              mobileView === 'chat' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-[#E6DFD3] space-y-3.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h1 className="font-serif text-2xl font-semibold text-[#141312]">
                  Inbox
                </h1>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-[#7A7267] tabular-nums">
                    {isLoadingThreads ? 'Syncing...' : `${conversations.length} threads`}
                  </span>
                  <button
                    type="button"
                    disabled={isLoadingThreads}
                    onClick={refreshConversations}
                    aria-label="Refresh conversation threads"
                    className="p-1.5 rounded-lg text-[#7A7267] hover:text-[#141312] hover:bg-[#EFEAE0] disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingThreads ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7A7267] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={inboxQuery}
                  onChange={(e) => setInboxQuery(e.target.value)}
                  aria-label="Search conversations"
                  placeholder="Search artwork or artist..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF8F3] border border-[#DFD8CA] rounded-xl text-xs text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll">
              {isLoadingThreads ? (
                <InboxThreadListSkeleton count={4} />
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#7A7267]">
                  No conversations match your search.
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredConversations.map((conv) => {
                    const art = getArtworkById(conv.artworkId);
                    const artist = getProfileById(conv.artistId);
                    const convOffers = offers.filter((o) => o.conversationId === conv.id);
                    const lastOff = convOffers[convOffers.length - 1];
                    const selected = conv.id === selectedConvId;

                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => handleSelectConversation(conv.id)}
                        className="relative w-full text-left p-3.5 rounded-xl transition-colors flex items-start gap-3 group"
                      >
                        {selected && (
                          <motion.span
                            layoutId="inbox-active-row-bg"
                            transition={{
                              type: 'spring',
                              stiffness: 450,
                              damping: 36,
                            }}
                            className="absolute inset-0 bg-[#F3EFE6] border border-[#E2D9C8] rounded-xl"
                          />
                        )}
                        <div className="relative z-10 w-12 h-12 rounded-lg overflow-hidden border border-[#E6DFD3] shrink-0">
                          <ArtworkImage
                            imageKey={art?.imageKey}
                            alt={art?.title || 'Artwork'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="relative z-10 min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-serif text-base font-semibold text-[#141312] truncate">
                              {art?.title || 'Artwork Inquiry'}
                            </p>
                            {conv.unreadCount ? (
                              <span className="text-[11px] font-mono font-medium text-[#8C6828] shrink-0">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-[#6B655E] truncate">
                            {artist?.fullName}
                            {lastOff
                              ? ` · ${formatOfferStatusLabel(lastOff.status)}`
                              : ''}
                          </p>
                          <p className="text-xs text-[#7A7267] line-clamp-1">
                            {conv.lastMessagePreview}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* CENTER: Active Private Conversation */}
          <section
            className={`lg:col-span-5 xl:col-span-6 min-h-0 flex flex-col lg:border-r border-[#E6DFD3] ${
              mobileView === 'inbox' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {isLoadingThreads || isSwitchingThread ? (
              <ConversationMessagesSkeleton />
            ) : activeConv && activeArtwork ? (
              <>
                {/* Conversation Header */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E6DFD3] bg-[#FAF8F3]/90 backdrop-blur-sm flex items-center justify-between gap-2 sm:gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileView('inbox')}
                      aria-label="Back to conversation inbox"
                      className="lg:hidden p-1.5 rounded-lg text-[#5C554C] hover:bg-[#EFEAE0]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <ProfileAvatar
                      name={activeArtist?.fullName || 'Artist'}
                      avatarKey={activeArtist?.avatarUrl}
                      sizeClass="w-9 h-9 text-xs"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#141312] truncate">
                        {activeArtist?.fullName} & {activeCollector?.fullName}
                      </p>
                      <p className="text-xs text-[#7A7267] truncate">
                        Re: {activeArtwork.title} · Asking{' '}
                        <span className="font-mono tabular-nums">
                          {formatMoney(activeArtwork.price, activeArtwork.currency)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Mobile button to open Artwork & Offer Dossier */}
                  <button
                    type="button"
                    onClick={() => setMobileDossierOpen(true)}
                    className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#B38B40] text-[#141312] rounded-lg whitespace-nowrap shrink-0"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Offer Details
                  </button>
                </div>

                {/* Message History */}
                <div
                  ref={messageListRef}
                  className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain artverse-scroll space-y-4 bg-[#FCFBF8]"
                >
                  <AnimatePresence initial={false}>
                    {activeMessages.map((msg) => {
                      const sender = getProfileById(msg.senderId);
                      const isSelf = msg.senderId === effectiveViewerId;

                      if (msg.messageType === 'offer_event') {
                        return (
                          <motion.div
                            key={msg.id}
                            initial={
                              shouldReduceMotion
                                ? { opacity: 1 }
                                : { opacity: 0, y: 8, scale: 0.98 }
                            }
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.18, ease: EASE_OUT }}
                            className="my-3 mx-auto max-w-md p-4 rounded-xl bg-[#F4EFE4] border border-[#DED3BE] text-center space-y-1"
                          >
                            <p className="text-[11px] tracking-wide text-[#8C6828] font-medium">
                              Negotiation Record · {sender?.fullName}
                            </p>
                            <p className="text-xs text-[#141312] leading-relaxed">
                              {msg.body}
                            </p>
                            <p className="text-[11px] text-[#7A7267]">
                              {formatTimeStamp(msg.createdAt)}
                            </p>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={msg.id}
                          initial={
                            shouldReduceMotion
                              ? { opacity: 1 }
                              : { opacity: 0, y: 8, scale: 0.985 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.18, ease: EASE_OUT }}
                          className={`flex flex-col ${
                            isSelf ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1 text-[11px] text-[#7A7267]">
                            <span>{sender?.fullName || 'Participant'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatTimeStamp(msg.createdAt)}</span>
                          </div>
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              isSelf
                                ? 'bg-[#141312] text-[#FAF8F3] rounded-br-md'
                                : 'bg-white border border-[#E6DFD3] text-[#141312] rounded-bl-md shadow-2xs'
                            }`}
                          >
                            <p>{msg.body}</p>
                            {msg.attachmentName && (
                              <div
                                className={`mt-2 pt-2 border-t flex items-center gap-2 text-xs ${
                                  isSelf
                                    ? 'border-[#332E29] text-[#E6C98F]'
                                    : 'border-[#EFEAE0] text-[#8C6828]'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{msg.attachmentName}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Message Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 bg-white border-t border-[#E6DFD3] space-y-2.5 shrink-0"
                >
                  <AnimatePresence>
                    {selectedAttachment && (
                      <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F3EFE6] text-xs text-[#3B352F]"
                      >
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-[#B38B40]" />
                          Attached: {selectedAttachment}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(null)}
                          aria-label="Remove attachment"
                          className="text-[#7A7267] hover:text-[#141312]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentMenu((prev) => !prev)}
                        aria-label="Attach dossier or condition document"
                        className="w-10 h-10 rounded-xl border border-[#D8D0C1] bg-[#FAF8F3] flex items-center justify-center text-[#5C554C] hover:text-[#141312] hover:border-[#B38B40] transition-colors"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showAttachmentMenu && (
                          <motion.div
                            initial={
                              shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 6, scale: 0.97 }
                            }
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={
                              shouldReduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 4, scale: 0.97 }
                            }
                            transition={{ duration: 0.16, ease: EASE_OUT }}
                            className="absolute bottom-12 left-0 w-64 bg-white border border-[#D8D0C1] rounded-xl shadow-lg p-2 z-20 space-y-1"
                          >
                            <p className="px-2.5 py-1 text-[11px] font-medium text-[#7A7267]">
                              Attach Studio Document
                            </p>
                            {SAMPLE_ATTACHMENTS.map((file) => (
                              <button
                                key={file}
                                type="button"
                                onClick={() => {
                                  setSelectedAttachment(file);
                                  setShowAttachmentMenu(false);
                                }}
                                className="w-full text-left px-2.5 py-2 text-xs text-[#141312] hover:bg-[#F3EFE6] rounded-lg transition-colors truncate"
                              >
                                {file}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <label htmlFor="message-composer-input" className="sr-only">
                      Write message
                    </label>
                    <input
                      id="message-composer-input"
                      type="text"
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      placeholder={`Write to ${
                        effectiveViewerId === activeConv.collectorId
                          ? activeArtist?.fullName
                          : activeCollector?.fullName
                      }...`}
                      className="flex-1 px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] placeholder:text-[#9A9184] focus:outline-none focus:border-[#B38B40] transition-colors"
                    />

                    <motion.button
                      type="submit"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                      aria-label="Send message"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#141312] text-[#FAF8F3] text-xs font-medium rounded-xl hover:bg-[#2A2724] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </motion.button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-10 text-center text-sm text-[#6B655E]">
                Select a conversation from the inbox or inquire from an artwork detail
                page to start negotiating.
              </div>
            )}
          </section>

          {/* RIGHT: Desktop Artwork & Price Negotiation Dossier */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 min-h-0 p-5 sm:p-6 overflow-y-auto overscroll-contain artverse-scroll bg-white">
            {isLoadingThreads || isSwitchingThread ? (
              <NegotiationDossierSkeleton />
            ) : (
              renderNegotiationDossier('desktop')
            )}
          </aside>
        </div>
      </div>

      {/* Mobile Slide-Over Dossier Drawer */}
      <AnimatePresence>
        {mobileDossierOpen && (
          <div
            onClick={() => setMobileDossierOpen(false)}
            className="fixed inset-0 z-50 lg:hidden bg-[#141312]/60 backdrop-blur-[2px] flex justify-end"
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white h-dvh max-h-dvh flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E6DFD3] shrink-0">
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#141312]">
                  Artwork & Offer Terms
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileDossierOpen(false)}
                  aria-label="Close offer terms drawer"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5C554C] hover:bg-[#EFEAE0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain artverse-scroll p-5 sm:p-6">
                {isLoadingThreads || isSwitchingThread ? (
                  <NegotiationDossierSkeleton />
                ) : (
                  renderNegotiationDossier('mobile')
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeArtwork && (
        <PurchaseIntentModal
          artwork={activeArtwork}
          agreedAmount={
            latestOffer?.status === 'accepted' ? latestOffer.amount : undefined
          }
          offerId={latestOffer?.status === 'accepted' ? latestOffer.id : undefined}
          isOpen={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          onCreateIntent={createOrderIntent}
        />
      )}
    </div>
  );
};
