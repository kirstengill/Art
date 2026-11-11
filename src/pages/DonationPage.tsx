import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useArtVerse } from '../context/ArtVerseContext';
import { formatMoney } from '../utils/formatters';
import type { Donation } from '../types/artverse';
import { Plus, Gift, Send, User, ShieldCheck, Clock } from 'lucide-react';

export function DonationPage() {
  const { currentUser, donations, createDonation, fetchDonations, donationError, isAuthLoading } =
    useArtVerse();
  const { artistId } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage('Please enter a valid donation amount.');
      return;
    }
    setSubmitting(true);
    try {
      await createDonation({
        amount: amt,
        artistId: artistId || undefined,
        message: message.trim() || undefined,
        isAnonymous,
      });
      setAmount('');
      setMessage('');
      setIsAnonymous(false);
      void fetchDonations();
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-12 text-center">
        <p className="text-[#5C554C]">Loading account&hellip;</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-12 text-center">
        <p className="text-[#5C554C]">Please sign in to make a donation.</p>
      </div>
    );
  }

  if (String(currentUser.role) === 'artist') {
    return (
      <div className="max-w-[760px] mx-auto px-6 py-12 text-center">
        <Gift className="h-8 w-8 text-[#B38B40] mb-3" />
        <h2 className="font-serif text-xl font-bold mb-2">Donations are for collectors and art lovers</h2>
        <p className="text-[#5C554C]">
          Artist accounts cannot make donations. If you would like to support other artists, please
          register or switch to a collector or art lover account.
        </p>
      </div>
    );
  }

  const isArtist = currentUser.role === 'artist';
  const ownDonations = donations.filter((d) => d.donorId === currentUser.id);
  const receivedDonations = donations.filter((d) => d.artistId === currentUser.id);

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <Gift className="h-6 w-6 text-[#B38B40]" />
        <h1 className="text-2xl font-serif font-bold">Donate to Louvre Singa</h1>
      </div>
      <p className="text-[#5C554C]">
        Support artists directly with a donation. Donations are mediated manually by Louvre Singa
        administrators and are not automated payments.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Send a donation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#4F473D]">Amount (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
                />
              </div>
              {artistId && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#4F473D]">Message to artist (optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Share a note with the artist&hellip;"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#D4C5B0] bg-white text-[#141312] focus:outline-none focus:ring-2 focus:ring-[#C59B47]"
                  />
                </div>
              )}
              <div className="flex items-start gap-3">
                <input
                  id="anonymous"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[#C59B47] border-[#D4C5B0] rounded focus:ring-[#C59B47]"
                />
                <label htmlFor="anonymous" className="text-sm text-[#5C554C]">
                  Make this donation anonymous
                </label>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                  color: '#141312',
                }}
              >
                <Send className="h-4 w-4" /> {submitting ? 'Processing&hellip;' : 'Donate'}
              </button>
            </form>
          </div>
          {donationError && (
            <div className="rounded-lg border border-red-900/30 bg-red-900/10 p-4 text-red-300 text-sm">
              {donationError}
            </div>
          )}
        </section>

        <aside className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-6">
            <h3 className="font-serif text-base font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#B38B40]" /> Your donations
            </h3>
            {ownDonations.length === 0 ? (
              <p className="text-xs text-[#5C554C]">No donations yet.</p>
            ) : (
              <ul className="space-y-3">
                {ownDonations.map((d: Donation) => (
                  <li key={d.id} className="flex items-start gap-3 text-xs">
                    <div className="flex-1">
                      <div className="font-medium text-[#141312]">
                        {d.isAnonymous ? 'Anonymous donor' : currentUser.fullName}
                      </div>
                      <div className="text-[#4F473D]">{d.message || 'No message'}</div>
                    </div>
                    <div className="font-mono font-semibold text-[#B38B40]">
                      {formatMoney(d.amount, d.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isArtist && (
            <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-6">
              <h3 className="font-serif text-base font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#B38B40]" /> Received donations
              </h3>
              <div className="text-xs text-[#5C554C]">
                Total received: <span className="font-mono font-semibold text-[#B38B40]">{formatMoney(
                  receivedDonations.reduce((sum: number, d: Donation) => sum + d.amount, 0),
                  'USD'
                )}</span>
              </div>
              {receivedDonations.length === 0 ? (
                <p className="text-xs text-[#5C554C] mt-2">No donations received yet.</p>
              ) : (
                <ul className="space-y-2 mt-3">
                  {receivedDonations.slice(0, 5).map((d: Donation) => (
                    <li key={d.id} className="flex justify-between items-start gap-3 text-xs">
                      <span className="text-[#5C554C]">{d.isAnonymous ? 'Anonymous' : d.donorId.slice(-6)}</span>
                      <span className="font-mono font-semibold text-[#B38B40]">{formatMoney(d.amount, d.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="rounded-xl border border-[#E2D6BD] bg-[#F5EFE2] p-6 text-xs text-[#5C554C]">
            <p className="mb-2 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Donations are not automated payments.
            </p>
            <p>Louvre Singa administrators coordinate payout and delivery manually. This creates a
            donation record only; funds are settled outside the platform.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
