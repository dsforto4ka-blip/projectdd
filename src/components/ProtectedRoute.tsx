import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActive?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireActive = false,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { authReady, userPrivate, isAdmin } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="h-8 w-48 rounded bg-neutral-200 dark:bg-dark-elevated animate-pulse" />
        <div className="mt-4 h-32 rounded-xl bg-neutral-100 dark:bg-dark-surface animate-pulse" />
      </div>
    );
  }

  if (!userPrivate) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/jobs" replace />;
  }

  if (userPrivate.accountStatus === 'onboarding' && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireActive && userPrivate.accountStatus !== 'active') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
