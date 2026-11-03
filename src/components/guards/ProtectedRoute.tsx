import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useArtVerse } from '../../context/ArtVerseContext';
import type { AccountRole } from '../../types/artverse';
import { dashboardPathForRole } from '../../utils/roleRoutes';

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
  const { currentUser, isAuthLoading, authError } = useArtVerse();
  const location = useLocation();

  if (requireAuth && isAuthLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p role="status" className="flex items-center gap-3 text-sm text-[#6B655E]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#B38B40] border-t-transparent" />
          Verifying your Supabase account…
        </p>
      </div>
    );
  }

  if (requireAuth && authError && !currentUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p role="alert" className="max-w-md text-center text-sm text-red-700">
          Unable to verify your account role. Please try signing in again.
        </p>
      </div>
    );
  }

  if (requireAuth && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={dashboardPathForRole(currentUser.role)} replace />;
  }

  return <>{children}</>;
};

export const RoleGuard: React.FC<ProtectedRouteProps> = ProtectedRoute;
