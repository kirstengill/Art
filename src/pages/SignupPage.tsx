import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import type { UserRole } from '../types/artverse';
import { formatRoleLabel } from '../utils/formatters';
import { GlassPanel } from '../components/ui/GlassCard';
import terracottaArtwork from '../assets/images/art_terracotta_study_1792993240609.jpg';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  artist:
    'Publish original works, set direct or offer pricing, and manage collector inquiries.',
  collector:
    'Acquire works directly, submit private offers, and curate saved collections.',
  art_lover:
    'Follow contemporary ateliers, join community discussions, and save favorite works.',
};

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SignupPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, signUpWithEmail } = useArtVerse();

  const [role, setRole] = useState<UserRole>('artist');
  const [fullName, setFullName] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locationState = location.state as { from?: { pathname?: unknown } } | null;
  const requestedDestination = locationState?.from?.pathname;
  const from =
    typeof requestedDestination === 'string'
      ? requestedDestination
      : role === 'artist'
        ? '/dashboard'
        : '/gallery';

  const handleGoogleJoin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(
        role,
        from === '/signup' ? (role === 'artist' ? '/dashboard' : '/gallery') : from
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to start Google sign-up.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      setError('Please enter your full name or studio name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }

    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { emailConfirmationRequired } = await signUpWithEmail({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        location: locationInput.trim(),
      });
      setPassword('');
      if (emailConfirmationRequired) {
        setNotice('Account created. Check your email and confirm your address before signing in.');
      } else {
        const destination =
          from === '/signup' ? (role === 'artist' ? '/dashboard' : '/gallery') : from;
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

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
        className="my-auto w-full max-w-lg"
      >
        <GlassPanel className="auth-glass-panel space-y-6 p-6 sm:p-9">
        <div className="space-y-2 text-center">
          <Link to="/" className="mb-1 inline-block font-serif text-sm font-semibold tracking-[0.22em] text-white/80">
            ART UNIVERSE
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white text-balance">
            Create Your Account
          </h1>
          <div className="min-h-[2.25rem] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={role}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="max-w-sm text-xs text-white/75"
              >
                {ROLE_DESCRIPTIONS[role]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Account Role Selection with spring gliding pill */}
        <div
          role="group"
          aria-label="Select membership role"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl relative"
        >
          {(['artist', 'collector', 'art_lover'] as UserRole[]).map((item) => {
            const active = role === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`relative py-2 px-1.5 sm:px-2 text-[11px] sm:text-xs font-medium rounded-lg transition-colors whitespace-nowrap truncate z-10 ${
                  active
                    ? 'text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="signup-role-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    className="absolute inset-0 rounded-lg bg-white/20 shadow-xs -z-10"
                  />
                )}
                {formatRoleLabel(item)}
              </button>
            );
          })}
        </div>

        <motion.button
          type="button"
          disabled={loading}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          onClick={handleGoogleJoin}
          className="w-full rounded-xl border border-white/25 bg-black/55 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/70 disabled:opacity-50 whitespace-nowrap"
        >
          Join with Google as {formatRoleLabel(role)}
        </motion.button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-white/25" />
          <span className="shrink-0 mx-3 text-xs text-white/75">or use email</span>
          <div className="flex-grow border-t border-white/25" />
        </div>

        <form onSubmit={handleSignupSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="signup-name"
                className="block text-xs font-medium text-white/90"
              >
                Full Name or Studio *
              </label>
              <input
                id="signup-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Camille Laurent"
                className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:border-[#e3c783] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-location"
                className="block text-xs font-medium text-white/90"
              >
                City & Country
              </label>
              <input
                id="signup-location"
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g., Paris, France"
                className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:border-[#e3c783] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-xs font-medium text-white/90"
            >
              Email Address *
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="studio@example.com"
              className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:border-[#e3c783] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-xs font-medium text-white/90"
            >
              Password *
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-white/25 bg-white/10 py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-white/55 focus:border-[#e3c783] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/75 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-200">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs font-medium text-emerald-100">
              {notice}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="w-full rounded-xl bg-[#d3b578] px-4 py-2.5 text-sm font-semibold text-[#211c13] transition-colors hover:bg-[#e4cb99] disabled:opacity-50"
          >
            {loading
              ? 'Creating Account...'
              : `Create ${formatRoleLabel(role)} Account`}
          </motion.button>

          <p className="text-center text-[11px] leading-relaxed text-white/70">
            Your account is managed by Supabase Auth. Email confirmation may be
            required before your first sign-in.
          </p>
        </form>

        <p className="border-t border-white/20 pt-2 text-center text-xs text-white/80">
          Already a member?{' '}
          <Link
            to="/login"
            className="font-medium text-[#f0d79f] hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </p>
        <Link to="/" className="block text-center text-xs text-white/70 transition-colors hover:text-white">
          Back to home
        </Link>
        </GlassPanel>
      </motion.div>
    </div>
  );
};
