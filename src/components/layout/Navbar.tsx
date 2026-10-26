import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useArtVerse } from '../../context/ArtVerseContext';

const NAV_LINKS = [
  { to: '/', label: 'Discover' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/artists', label: 'Artists' },
  { to: '/community', label: 'Community' },
  { to: '/messages', label: 'Messages' },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const { currentUser } = useArtVerse();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#141312]/95 backdrop-blur-md text-[#FAF8F3] border-b border-[#292623]">
      <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8 h-14 sm:h-16">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          className="font-serif text-2xl font-semibold tracking-wide text-[#FAF8F3] whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C59B47]"
        >
          ArtVerse
        </Link>

        {/* Zone 2: 5 concise single-line text navigation links with dynamic gliding hover & active underline */}
        <nav
          aria-label="Primary navigation"
          onMouseLeave={() => setHoveredPath(null)}
          className="hidden md:flex items-center gap-2 text-sm font-medium text-[#C8C1B6]"
        >
          {NAV_LINKS.map((item) => {
            const active = isActive(item.to);
            const hovered = hoveredPath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onMouseEnter={() => setHoveredPath(item.to)}
                className={`relative px-3.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C59B47] ${
                  active ? 'text-[#FAF8F3]' : 'hover:text-[#FAF8F3]'
                }`}
              >
                {hovered && !shouldReduceMotion && (
                  <motion.span
                    layoutId="artverse-nav-hover-surface"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-white/[0.07]"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
                {active && (
                  <motion.span
                    layoutId={
                      shouldReduceMotion ? undefined : 'artverse-nav-indicator'
                    }
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute left-3.5 right-3.5 -bottom-[14px] h-[2px] bg-[#C59B47]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action on desktop + mobile drawer button */}
        <div className="flex items-center gap-3 shrink-0">
          <motion.div
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block"
          >
            <Link
              to={currentUser ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium tracking-wide bg-[#B38B40] text-[#141312] rounded-lg hover:bg-[#C69D4E] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B47]"
            >
              <span>{currentUser ? 'Artist Studio' : 'Sign In'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={
              mobileOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[#FAF8F3] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B47]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Smooth Scroll Depth Progress Rail */}
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          style={{ scaleX: smoothProgress }}
          className="h-[2px] bg-gradient-to-r from-[#8E6C2E] via-[#D4AE62] to-[#B38B40] origin-left"
        />
      )}

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden bg-[#141312] border-t border-[#292623] px-4 sm:px-5 py-4 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain artverse-scroll"
          >
            <nav
              aria-label="Mobile navigation"
              className="flex flex-col space-y-1"
            >
              {NAV_LINKS.map((item, idx) => {
                const active = isActive(item.to);
                return (
                  <motion.div
                    key={item.to}
                    initial={
                      shouldReduceMotion ? false : { opacity: 0, x: -8 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.16 }}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-white/10 text-[#E5C580]'
                          : 'text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
              <div className="pt-3 mt-2 border-t border-[#292623] flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3]"
                >
                  Artist Dashboard & Add Artwork
                </Link>
                <Link
                  to={currentUser ? '/dashboard' : '/login'}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-center rounded-lg text-sm font-semibold bg-[#B38B40] text-[#141312] hover:bg-[#C69D4E]"
                >
                  {currentUser
                    ? `Signed in as ${currentUser.fullName}`
                    : 'Sign In / Join ArtVerse'}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
