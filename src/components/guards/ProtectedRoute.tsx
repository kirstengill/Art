import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useArtVerse } from '../../context/ArtVerseContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<'artist' | 'collector' | 'art_lover' | 'admin'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
}) => {
  const { currentUser, authMode } = useArtVerse();
  const location = useLocation();

  if (requireAuth && !currentUser && authMode !== 'demo') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role as any)) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !currentUser && authMode === 'demo' && allowedRoles.includes('admin')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const RoleGuard: React.FC<ProtectedRouteProps> = ProtectedRoute;
