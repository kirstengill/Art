import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useArtVerse } from '../context/ArtVerseContext';

function getReturnPath(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard';
}

export const AuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useArtVerse();
  const [timedOut, setTimedOut] = useState(false);
  const params = new URLSearchParams(location.search);
  const authError = params.get('error_description') || params.get('error');
  const returnTo = getReturnPath(params.get('next'));

  useEffect(() => {
    if (currentUser) {
      navigate(returnTo, { replace: true });
    }
  }, [currentUser, navigate, returnTo]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#171614] px-4 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-white/[0.07] p-7 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d6bb7e]">
          Art Universe
        </p>
        <h1 className="mt-3 font-serif text-2xl">Completing sign-in</h1>
        {authError ? (
          <>
            <p role="alert" className="mt-3 text-sm text-red-200">{authError}</p>
            <Link to="/login" className="mt-5 inline-block text-sm text-[#f0d79f] hover:text-white">
              Return to sign in
            </Link>
          </>
        ) : timedOut && !currentUser ? (
          <>
            <p role="alert" className="mt-3 text-sm text-white/70">
              Sign-in could not be completed. Please try again.
            </p>
            <Link to="/login" className="mt-5 inline-block text-sm text-[#f0d79f] hover:text-white">
              Return to sign in
            </Link>
          </>
        ) : (
          <p role="status" className="mt-3 text-sm text-white/70">
            Verifying your Supabase account…
          </p>
        )}
      </section>
    </main>
  );
};
