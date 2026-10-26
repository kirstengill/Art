import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import type { UserRole } from '../types/artverse';
import { formatRoleLabel } from '../utils/formatters';

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
  const { signInWithGoogle, signInDemoSession } = useArtVerse();

  const [role, setRole] = useState<UserRole>('artist');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleJoin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(role);
      navigate(role === 'artist' ? '/dashboard' : '/gallery');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google registration popup was closed or unavailable.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
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
    setLoading(true);
    setTimeout(() => {
      // Never store passwords in application tables
      signInDemoSession({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        location: location.trim() || 'London, United Kingdom',
      });
      setPassword('');
      setLoading(false);
      navigate(role === 'artist' ? '/dashboard' : '/gallery');
    }, 180);
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-5 py-8 sm:py-14">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: EASE_OUT }}
        className="w-full max-w-lg bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-9 space-y-6 shadow-xs my-auto"
      >
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium tracking-wide text-[#8C6828]">
            Community Membership
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] text-balance">
            Join ArtVerse
          </h1>
          <div className="min-h-[2.25rem] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={role}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-[#6B655E] max-w-sm"
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
          className="grid grid-cols-3 gap-1 p-1 bg-[#EFEAE0] rounded-xl relative"
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
                    ? 'text-[#141312]'
                    : 'text-[#5C554C] hover:text-[#141312]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="signup-role-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
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
          className="w-full py-2.5 px-4 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#2A2724] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          Join with Google as {formatRoleLabel(role)}
        </motion.button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#E6DFD3]" />
          <span className="shrink-0 mx-3 text-xs text-[#7A7267]">
            or create a local demo profile
          </span>
          <div className="flex-grow border-t border-[#E6DFD3]" />
        </div>

        <form onSubmit={handleSignupSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="signup-name"
                className="block text-xs font-medium text-[#3B352F]"
              >
                Full Name or Studio *
              </label>
              <input
                id="signup-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Camille Laurent"
                className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="signup-location"
                className="block text-xs font-medium text-[#3B352F]"
              >
                City & Country
              </label>
              <input
                id="signup-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Paris, France"
                className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-xs font-medium text-[#3B352F]"
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
              className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-xs font-medium text-[#3B352F]"
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
                className="w-full pl-4 pr-10 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7267] hover:text-[#141312]"
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
            <p role="alert" className="text-xs font-medium text-[#992E24]">
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="w-full py-2.5 px-4 text-sm font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] disabled:opacity-50 transition-colors"
          >
            {loading
              ? 'Creating Profile...'
              : `Start ${formatRoleLabel(role)} Demo Session`}
          </motion.button>

          <p className="text-[11px] text-[#7A7267] leading-relaxed text-center">
            Joining with Google creates a permanent member profile. Demo registration
            runs in client session state without storing credentials.
          </p>
        </form>

        <p className="text-center text-xs text-[#5C554C] pt-2 border-t border-[#ECE6DA]">
          Already a member?{' '}
          <Link
            to="/login"
            className="font-medium text-[#8C6828] hover:text-[#141312] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
