import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import { GlassPanel } from '../components/ui/GlassCard';
import gildedArtwork from '../assets/images/hero_gilded_horizon_1792993235968.jpg';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const LoginPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, currentUser } = useArtVerse();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locationState = location.state as { from?: { pathname?: unknown } } | null;
  const requestedDestination = locationState?.from?.pathname;
  const from =
    typeof requestedDestination === 'string' ? requestedDestination : '/dashboard';
  const destination = from === '/login' || from === '/signin' ? '/dashboard' : from;

  useEffect(() => {
    if (currentUser) navigate(destination, { replace: true });
  }, [currentUser, destination, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(trimmedEmail, password);
      setPassword('');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="artwork-auth-scene relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-5 sm:py-12"
      style={{ backgroundImage: `url("${gildedArtwork}")` }}
    >
      <div aria-hidden="true" className="artwork-auth-overlay" />
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: EASE_OUT }}
        className="my-auto w-full max-w-md"
      >
        <GlassPanel className="auth-glass-panel space-y-6 p-6 sm:p-9">
        <div className="space-y-2 text-center">
          <Link to="/" className="mb-1 inline-block font-serif text-sm font-semibold tracking-[0.22em] text-white/80">
            ART UNIVERSE
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white text-balance">
            Welcome Back
          </h1>
          <p className="text-xs text-white/75">
            Sign in to your account
          </p>
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-white/25" />
          <span className="shrink-0 mx-3 text-xs text-white/75">Sign in with email</span>
          <div className="flex-grow border-t border-white/25" />
        </div>

        <form onSubmit={handleSignIn} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-white/90"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collector@example.com"
              className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/55 focus:border-[#e3c783] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-white/90"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
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

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="w-full rounded-xl bg-[#d3b578] px-4 py-2.5 text-sm font-semibold text-[#211c13] transition-colors hover:bg-[#e4cb99] disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </motion.button>

          <p className="text-center text-[11px] leading-relaxed text-white/70">
            Your account is securely authenticated by Supabase. New members can
            create an account below.
          </p>
        </form>

        <p className="border-t border-white/20 pt-2 text-center text-xs text-white/80">
          New to Art Universe?{' '}
          <Link
            to="/signup"
            className="font-medium text-[#f0d79f] hover:text-white transition-colors"
          >
            Create an Artist, Collector, or Art Lover account
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
