import React, { useEffect, useState } from 'react';
import { useArtVerse } from '../../context/ArtVerseContext';

interface ResendConfirmationButtonProps {
  email: string;
}

export const ResendConfirmationButton: React.FC<ResendConfirmationButtonProps> = ({
  email,
}) => {
  const { resendConfirmationEmail } = useArtVerse();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((remaining) => Math.max(remaining - 1, 0)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email.trim() || loading || cooldown > 0) return;
    setLoading(true);
    setNotice(null);
    setError(null);
    try {
      await resendConfirmationEmail(email);
      setNotice('A new confirmation email has been sent. Please check your inbox.');
      setCooldown(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? `We couldn't send the confirmation email: ${err.message}`
          : "We couldn't send the confirmation email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={!email.trim() || loading || cooldown > 0}
        className="w-full rounded-xl bg-[#d3b578] px-4 py-3 text-sm font-semibold text-[#211c13] transition-colors hover:bg-[#e4cb99] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {loading
          ? 'Sending confirmation email…'
          : cooldown > 0
            ? `Resend available in ${cooldown}s`
            : 'Resend confirmation email'}
      </button>
      {notice && (
        <p role="status" className="text-center text-xs text-emerald-100">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  );
};
