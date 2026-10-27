import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArtVerseProvider } from './context/ArtVerseContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { GalleryPage } from './pages/GalleryPage';
import { ArtworkDetailPage } from './pages/ArtworkDetailPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { ArtistProfilePage } from './pages/ArtistProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { MessagesPage } from './pages/MessagesPage';
import { DashboardPage } from './pages/DashboardPage';
import { AddArtworkPage } from './pages/AddArtworkPage';
import { CollectedGalleryPage } from './pages/CollectedGalleryPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AdminPage } from './pages/AdminPage';
import { ProtectedRoute } from './components/guards/ProtectedRoute';

const ScrollAndAnimateRoutes: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const isImmersivePage = ['/', '/login', '/signin', '/signup', '/auth/callback'].includes(
    location.pathname
  );

  return (
    <>
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
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/add-artwork" element={<ProtectedRoute allowedRoles={['artist']}><AddArtworkPage /></ProtectedRoute>} />
            <Route path="/collection" element={<ProtectedRoute allowedRoles={['collector']}><CollectedGalleryPage /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
