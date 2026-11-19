import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useArtVerse } from '../context/ArtVerseContext';
import { supabase } from '../lib/supabase';
import { dashboardPathForRole } from '../utils/roleRoutes';

const PENDING_EMAIL_KEY = 'louvre-singa-pending-email';
const OTP_TYPES = new Set([
  'signup',
  'email',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
]);

export const AuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, authError: profileError } = useArtVerse();
  const [verifiedCallback, setVerifiedCallback] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type');
  const callbackCode = searchParams.get('code');
  const callbackErrorDescription =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error_description') ||
    hashParams.get('error');
  const hasSessionCallback =
    Boolean(callbackCode) ||
    Boolean(hashParams.get('access_token')) ||
    Boolean(hashParams.get('refresh_token'));

  useEffect(() => {
    let active = true;
    if (callbackErrorDescription) {
      setCallbackError(
        'This confirmation link is invalid, expired or has already been used. If you have already verified your email, sign in; otherwise request a new link.'
      );
      return () => {
        active = false;
      };
    }

    if (tokenHash) {
      if (!supabase || !otpType || !OTP_TYPES.has(otpType)) {
        setCallbackError('This confirmation link is incomplete or invalid. Please request a new link.');
      } else {
        void supabase.auth
          .verifyOtp({
            token_hash: tokenHash,
            type: otpType as EmailOtpType,
          })
          .then(({ data, error }) => {
            if (!active) return;
            if (error || !data.user?.email_confirmed_at) {
              setCallbackError(
                'This confirmation link is invalid, expired or has already been used. If you have already verified your email, sign in; otherwise request a new link.'
              );
              return;
            }
            setVerifiedCallback(true);
          })
          .catch(() => {
            if (active) {
              setCallbackError(
                'This confirmation link is invalid, expired or has already been used. If you have already verified your email, sign in; otherwise request a new link.'
              );
            }
          });
      }
    } else if (hasSessionCallback) {
      if (!supabase) {
        setCallbackError('Supabase Auth is not configured. Please try again later.');
      } else {
        void supabase.auth.getSession().then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setCallbackError('We could not complete email verification. Please request a new link.');
          } else if (data.session?.user.email_confirmed_at) {
            setVerifiedCallback(true);
          } else if (data.session) {
            setCallbackError(
              'This confirmation link did not verify your email. Please request a new link.'
            );
          }
        });
      }
    } else {
      setCallbackError('This confirmation link is missing its verification details.');
    }

    return () => {
      active = false;
    };
  }, [callbackErrorDescription, hasSessionCallback, otpType, tokenHash]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 15000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!verifiedCallback || !currentUser) return;
    window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
    const timeout = window.setTimeout(
      () => navigate(dashboardPathForRole(currentUser.role), { replace: true }),
      1800
    );
    return () => window.clearTimeout(timeout);
  }, [currentUser, navigate, verifiedCallback]);

  const errorMessage =
    callbackError ||
    (verifiedCallback && profileError
      ? 'Your email is verified, but we could not prepare your Louvre Singa account. Please sign in to continue.'
      : timedOut && !currentUser
        ? verifiedCallback
          ? 'Your email is verified, but your Louvre Singa account is taking too long to load. Please sign in to continue.'
          : 'We could not complete this verification. Please sign in if your email is already verified, or request a new link.'
        : null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#171614] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-white/[0.07] p-7 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d6bb7e]">
          LOUVRE SINGA
        </p>
        <h1 className="mt-3 font-serif text-2xl">
          {errorMessage
            ? 'Email confirmation unavailable'
            : verifiedCallback
              ? 'Email verified'
              : 'Confirming your email'}
        </h1>
        {errorMessage ? (
          <>
            <p role="alert" className="mt-3 text-sm leading-relaxed text-red-200">
              {errorMessage}
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link to="/verify-email" className="text-[#f0d79f] hover:text-white">
                Request another confirmation email
              </Link>
              <Link to="/login" className="text-white/75 hover:text-white">
                Return to sign in
              </Link>
            </div>
          </>
        ) : verifiedCallback && currentUser ? (
          <p role="status" className="mt-3 text-sm text-white/75">
            Your Louvre Singa email is verified. Taking you to your account…
          </p>
        ) : (
          <p role="status" className="mt-3 text-sm text-white/70">
            Supabase is securely validating your confirmation link…
          </p>
        )}
      </section>
    </main>
  );
};
