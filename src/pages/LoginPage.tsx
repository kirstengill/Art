import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { useArtVerse } from '../context/ArtVerseContext';
import type { UserRole } from '../types/artverse';
import { formatRoleLabel } from '../utils/formatters';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const LoginPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { signInWithGoogle, signInDemoSession } = useArtVerse();

  const [role, setRole] = useState<UserRole>('collector');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle(role);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in popup was closed or unavailable.'
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoadingDemo(true);
    setTimeout(() => {
      // Never store passwords in application tables; starts a clean demo session
      const inferredName =
        role === 'artist'
          ? 'Clara Vance'
          : role === 'collector'
          ? 'Julian Mercer'
          : 'Elena Rostova';
      signInDemoSession({
        email: trimmedEmail,
        fullName: inferredName,
        role,
      });
      setPassword('');
      setLoadingDemo(false);
      navigate('/dashboard');
    }, 180);
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-5 py-8 sm:py-14">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: EASE_OUT }}
        className="w-full max-w-md bg-white border border-[#E6DFD3] rounded-2xl p-6 sm:p-9 space-y-6 shadow-xs my-auto"
      >
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium tracking-wide text-[#8C6828]">
            Member Access
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141312] text-balance">
            Sign in to ArtVerse
          </h1>
          <p className="text-xs text-[#6B655E]">
            Select your primary role in the gallery community.
          </p>
        </div>

        {/* Account Role Selector with spring gliding pill */}
        <div
          role="group"
          aria-label="Choose account role"
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
                    layoutId="login-role-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                  />
                )}
                {formatRoleLabel(item)}
              </button>
            );
          })}
        </div>

        {/* Live Authenticated Google Sign-In */}
        <motion.button
          type="button"
          disabled={loadingGoogle}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 px-4 text-sm font-medium bg-[#141312] text-[#FAF8F3] rounded-xl hover:bg-[#2A2724] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loadingGoogle
            ? 'Connecting with Google...'
            : `Continue with Google (${formatRoleLabel(role)})`}
        </motion.button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#E6DFD3]" />
          <span className="shrink-0 mx-3 text-xs text-[#7A7267]">
            or preview with demo credentials
          </span>
          <div className="flex-grow border-t border-[#E6DFD3]" />
        </div>

        <form onSubmit={handleDemoSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-[#3B352F]"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collector@artverse.gallery"
              className="w-full px-4 py-2.5 bg-[#FAF8F3] border border-[#D8D0C1] rounded-xl text-sm text-[#141312] focus:outline-none focus:border-[#B38B40] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-[#3B352F]"
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
                placeholder="Minimum 8 characters"
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
            disabled={loadingDemo}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className="w-full py-2.5 px-4 text-sm font-medium bg-[#B38B40] text-[#141312] rounded-xl hover:bg-[#C69D4E] disabled:opacity-50 transition-colors"
          >
            {loadingDemo ? 'Signing In...' : 'Enter Demo Session'}
          </motion.button>

          <p className="text-[11px] text-[#7A7267] leading-relaxed text-center">
            Sign in with Google to save your portfolio and collection across sessions.
            Demo sign-in opens a local role preview without storing passwords.
          </p>
        </form>

        <p className="text-center text-xs text-[#5C554C] pt-2 border-t border-[#ECE6DA]">
          New to ArtVerse?{' '}
          <Link
            to="/signup"
            className="font-medium text-[#8C6828] hover:text-[#141312] transition-colors"
          >
            Create an Artist, Collector, or Art Lover account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
