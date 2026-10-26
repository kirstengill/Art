import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import lapisArtwork from '../assets/images/art_lapis_refraction_1792993241626.jpg';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/gallery', label: 'Explore' },
];

export const LandingPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="art-universe-landing relative isolate min-h-dvh w-full overflow-hidden text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url("${lapisArtwork}")` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(12,11,10,0.78)_0%,rgba(12,11,10,0.48)_48%,rgba(12,11,10,0.12)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(12,11,10,0.35)_0%,transparent_40%)]"
      />

      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <Link
          to="/"
          className="font-serif text-xl font-semibold tracking-[0.16em] text-white sm:text-2xl"
        >
          ART UNIVERSE
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="rounded-full border border-white/45 bg-white/10 px-5 py-2.5 text-sm text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Sign Up <ArrowUpRight aria-hidden="true" className="ml-1 inline h-4 w-4" />
          </Link>
        </nav>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:hidden"
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Mobile navigation"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
            className="absolute inset-x-4 top-[76px] z-30 grid gap-1 rounded-2xl border border-white/25 bg-[#181716]/90 p-3 text-sm text-white shadow-xl backdrop-blur-xl md:hidden"
          >
            {[...NAV_LINKS, { to: '/login', label: 'Sign In' }, { to: '/signup', label: 'Sign Up' }].map(
              (item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 transition-colors hover:bg-white/10"
                >
                  {item.label}
                </Link>
              )
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-[1440px] items-center px-5 pb-20 pt-12 sm:px-8 lg:px-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-[#ead8b2] sm:text-sm">
            A contemporary art destination
          </p>
          <h1 className="max-w-3xl font-serif text-5xl font-medium uppercase leading-[0.98] tracking-[0.035em] text-white sm:text-7xl lg:text-8xl">
            Welcome to
            <br />
            <span className="italic font-normal">the Universe</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Discover extraordinary art. Explore creative minds. Find a piece that speaks to you.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/gallery"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#d3b578] px-7 text-sm font-semibold uppercase tracking-[0.12em] text-[#211c13] shadow-[0_10px_35px_rgba(0,0,0,0.24)] transition-colors hover:bg-[#e4cb99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Explore Art <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              to="/artists"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/50 bg-white/10 px-7 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Discover Artists <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>

      <p className="absolute bottom-6 right-6 hidden text-[10px] uppercase tracking-[0.22em] text-white/70 sm:block">
        Art, beyond the ordinary
      </p>
    </section>
  );
};
