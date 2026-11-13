import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArtVerseProvider, useArtVerse } from './context/ArtVerseContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { GalleryPage } from './pages/GalleryPage';
import { ArtworkDetailPage } from './pages/ArtworkDetailPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { ArtistProfilePage } from './pages/ArtistProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { LoadingStatusIndicator } from './components/ui/LoadingStatusIndicator';
import { dashboardPathForRole } from './utils/roleRoutes';

// Lazy load heavy pages - note: these use named exports
const DiscoverPage = lazy(() => import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AddArtworkPage = lazy(() => import('./pages/AddArtworkPage').then((m) => ({ default: m.AddArtworkPage })));
const CollectedGalleryPage = lazy(() => import('./pages/CollectedGalleryPage').then((m) => ({ default: m.CollectedGalleryPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const DonationPage = lazy(() => import('./pages/DonationPage').then((m) => ({ default: m.DonationPage })));
const ExhibitionPage = lazy(() => import('./pages/ExhibitionPage').then((m) => ({ default: m.ExhibitionPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current" />
  </div>
);

const DashboardRedirect: React.FC = () => {
  const { currentUser } = useArtVerse();
  return currentUser ? (
    <Navigate to={dashboardPathForRole(currentUser.role)} replace />
  ) : null;
};

const ScrollAndAnimateRoutes: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const previousPath = useRef(location.pathname);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    setIsNavigating(true);
    const timeout = window.setTimeout(() => setIsNavigating(false), 500);
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  const isImmersivePage = ['/', '/login', '/signin', '/signup', '/auth/callback'].includes(
    location.pathname
  );

  return (
    <>
      <LoadingStatusIndicator navigating={isNavigating} />
      {!isImmersivePage && <Navbar />}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 0, y: 10, scale: 0.996 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 0, y: -6, scale: 0.998 }
          }
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 w-full min-w-0"
        >
          <Suspense fallback={<PageLoader />}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<DiscoverPage />} />
              <Route path="/explore" element={<GalleryPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/artwork/:id" element={<ArtworkDetailPage />} />
              <Route path="/artists" element={<ArtistsPage />} />
              <Route path="/artists/:id" element={<ArtistProfilePage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
              <Route path="/dashboard/artist" element={<ProtectedRoute allowedRoles={['artist']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard/collector" element={<ProtectedRoute allowedRoles={['collector']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard/art-lover" element={<ProtectedRoute allowedRoles={['art_lover']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/add-artwork" element={<ProtectedRoute allowedRoles={['artist']}><AddArtworkPage /></ProtectedRoute>} />
              <Route path="/collection" element={<ProtectedRoute allowedRoles={['collector']}><CollectedGalleryPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signin" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
              <Route path="/exhibitions" element={<ExhibitionPage />} />
              <Route path="/donations" element={<ProtectedRoute><DonationPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>
      {!isImmersivePage && <Footer />}
    </>
  );
};

export default function App() {
  return (
    <ArtVerseProvider>
      <BrowserRouter>
        <div className="min-h-dvh w-full flex flex-col overflow-x-clip bg-[#FAF8F3] text-[#141312]">
          <ScrollAndAnimateRoutes />
        </div>
      </BrowserRouter>
    </ArtVerseProvider>
  );
}
