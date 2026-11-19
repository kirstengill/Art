import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Mail } from 'lucide-react';
import { GlassPanel } from '../components/ui/GlassCard';
import { ResendConfirmationButton } from '../components/auth/ResendConfirmationButton';
import terracottaArtwork from '../assets/images/art_terracotta_study_1792993240609.webp';

const PENDING_EMAIL_KEY = 'louvre-singa-pending-email';
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const VerificationPendingPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const location = useLocation();
  const navigationEmail =
    typeof location.state === 'object' &&
    location.state !== null &&
    'email' in location.state &&
    typeof location.state.email === 'string'
      ? location.state.email
      : '';
  const [email, setEmail] = useState(() => {
    const savedEmail =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(PENDING_EMAIL_KEY)
        : null;
    return navigationEmail || savedEmail || '';
  });

  React.useEffect(() => {
    if (email) window.sessionStorage.setItem(PENDING_EMAIL_KEY, email);
  }, [email]);

  return (
    <div
      className="artwork-auth-scene relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-5 sm:py-12"
      style={{ backgroundImage: `url("${terracottaArtwork}")` }}
    >
      <div aria-hidden="true" className="artwork-auth-overlay" />
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: EASE_OUT }}
        className="my-auto w-full max-w-md"
      >
        <GlassPanel className="auth-glass-panel space-y-6 p-6 text-center sm:p-9">
          <Link
            to="/"
            className="inline-block font-serif text-sm font-semibold tracking-[0.22em] text-white/80"
          >
            LOUVRE SINGA
          </Link>
          <div
            aria-hidden="true"
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#f0d79f]/60 bg-[#d3b578]/15 text-[#f0d79f]"
          >
            <Mail className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-semibold text-white sm:text-4xl">
              Check Your Email
            </h1>
            <p className="text-sm leading-relaxed text-white/80">
              We've sent a verification link to your email address. Please check your inbox and
              confirm your email to activate your Louvre Singa account.
            </p>
          </div>

          <div className="space-y-2 text-left">
            <label htmlFor="verification-email" className="block text-xs font-medium text-white/90">
              Email address
            </label>
            <input
              id="verification-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              readOnly={Boolean(navigationEmail)}
              className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/55 focus:border-[#e3c783] focus:outline-none read-only:cursor-default"
            />
          </div>

          <ResendConfirmationButton email={email} />
          <p className="text-xs leading-relaxed text-white/70">
            Once confirmed, you can sign in to continue to your account.
          </p>
          <Link
            to="/login"
            className="inline-block text-sm font-medium text-[#f0d79f] transition-colors hover:text-white"
          >
            Return to sign in
          </Link>
        </GlassPanel>
      </motion.div>
    </div>
  );
};
