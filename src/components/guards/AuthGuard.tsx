import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useArtVerse } from '../../context/ArtVerseContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, redirectTo = '/login' }) => {
  const { currentUser, authMode } = useArtVerse();
  const location = useLocation();

  if (!currentUser && authMode === 'guest') {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
