import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children, requireProfile = true }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireProfile && user?.profile_complete === false) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return children;
}
