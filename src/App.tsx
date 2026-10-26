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
import { DiscoverPage } from './pages/DiscoverPage';
import { GalleryPage } from './pages/GalleryPage';
import { ArtworkDetailPage } from './pages/ArtworkDetailPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { ArtistProfilePage } from './pages/ArtistProfilePage';
import { CommunityPage } from './pages/CommunityPage';
import { MessagesPage } from './pages/MessagesPage';
import { DashboardPage } from './pages/DashboardPage';
import { AddArtworkPage } from './pages/AddArtworkPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

const ScrollAndAnimateRoutes: React.FC = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
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
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/artwork/:id" element={<ArtworkDetailPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:id" element={<ArtistProfilePage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/add-artwork" element={<AddArtworkPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <ArtVerseProvider>
      <BrowserRouter>
        <div className="min-h-dvh w-full flex flex-col overflow-x-clip bg-[#FAF8F3] text-[#141312]">
          <Navbar />
          <ScrollAndAnimateRoutes />
          <Footer />
        </div>
      </BrowserRouter>
    </ArtVerseProvider>
  );
}
