import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';
import { ArrowUpRight, Menu, X, LogOut } from 'lucide-react';
import { useArtVerse } from '../../context/ArtVerseContext';
import { formatRoleLabel } from '../../utils/formatters';
import artivoraLogo from '../../images/artivora.png';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/gallery', label: 'Explore' },
  { to: '/artists', label: 'Artists' },
];

export const Navbar: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const { currentUser, logout } = useArtVerse();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
  };

  return (
    <header 
      className="sticky top-0 z-50 border-b border-white/10"
      style={{
        background: 'rgba(20, 19, 18, 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 h-16 sm:h-18">
        {/* Brand */}
        <Link
          to="/"
          className="whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C59B47]"
        >
          <img src={artivoraLogo} alt="ARTIVORA Logo" className="h-10 sm:h-12 w-auto mix-blend-mode-lighten" />
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-1 text-sm font-medium"
        >
          {PUBLIC_LINKS.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-4 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all duration-200 ${
                  active
                    ? 'text-[#FAF8F3]'
                    : 'text-[#C8C1B6] hover:text-[#FAF8F3] hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={shouldReduceMotion ? undefined : 'nav-active'}
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
          {currentUser && (
            <>
              {currentUser.role === 'collector' && (
                <Link
                  to="/collection"
                  className={`relative px-4 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all duration-200 ${
                    isActive('/collection')
                      ? 'text-[#FAF8F3]'
                      : 'text-[#C8C1B6] hover:text-[#FAF8F3] hover:bg-white/5'
                  }`}
                >
                  {isActive('/collection') && (
                    <motion.span
                      layoutId={shouldReduceMotion ? undefined : 'nav-active'}
                      className="absolute inset-0 rounded-lg bg-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">My Collection</span>
                </Link>
              )}
              <Link
                to="/dashboard"
                className={`relative px-4 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all duration-200 ${
                  isActive('/dashboard')
                    ? 'text-[#FAF8F3]'
                    : 'text-[#C8C1B6] hover:text-[#FAF8F3] hover:bg-white/5'
                }`}
              >
                {isActive('/dashboard') && (
                  <motion.span
                    layoutId={shouldReduceMotion ? undefined : 'nav-active'}
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {currentUser.role === 'artist' ? 'My Studio' : 'Dashboard'}
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentUser ? (
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs text-[#FAF8F3] font-medium">{currentUser.fullName}</p>
                <p className="text-[10px] text-[#C8C1B6]">{formatRoleLabel(currentUser.role)}</p>
              </div>
              <motion.button
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FAF8F3',
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </motion.button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-medium text-[#C8C1B6] hover:text-[#FAF8F3] transition-colors rounded-lg hover:bg-white/5"
              >
                Sign In
              </Link>
              <motion.div
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              >
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                    color: '#141312',
                    boxShadow: '0 4px 16px rgba(179, 139, 64, 0.3)',
                  }}
                >
                  <span>Sign Up</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[#FAF8F3] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B47]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {!shouldReduceMotion && (
        <motion.div
          aria-hidden="true"
          style={{ scaleX: smoothProgress }}
          className="h-[2px] bg-gradient-to-r from-[#8E6C2E] via-[#D4AE62] to-[#B38B40] origin-left"
        />
      )}

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden"
            style={{
              background: 'rgba(20, 19, 18, 0.98)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <nav className="px-4 py-4 space-y-2">
              {PUBLIC_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-white/10 text-[#FAF8F3]'
                      : 'text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {currentUser ? (
                <>
                  {currentUser.role === 'collector' && (
                    <Link
                      to="/collection"
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/collection')
                          ? 'bg-white/10 text-[#FAF8F3]'
                          : 'text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3]'
                      }`}
                    >
                      My Collection
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/dashboard')
                        ? 'bg-white/10 text-[#FAF8F3]'
                        : 'text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3]'
                    }`}
                  >
                    {currentUser.role === 'artist' ? 'My Studio' : 'Dashboard'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3] transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-lg text-sm font-medium text-[#C8C1B6] hover:bg-white/5 hover:text-[#FAF8F3] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-lg text-sm font-medium text-center"
                    style={{
                      background: 'linear-gradient(135deg, #B38B40 0%, #9E7B3B 100%)',
                      color: '#141312',
                    }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
