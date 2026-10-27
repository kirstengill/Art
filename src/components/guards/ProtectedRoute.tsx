import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useArtVerse } from '../../context/ArtVerseContext';
import type { AccountRole } from '../../types/artverse';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: AccountRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
}) => {
  const { currentUser } = useArtVerse();
  const location = useLocation();

  if (requireAuth && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const RoleGuard: React.FC<ProtectedRouteProps> = ProtectedRoute;
