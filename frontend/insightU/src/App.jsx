import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { useAuth } from "@/context/AuthContext";

const HomePage = lazy(() => import("@/pages/Home"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const ComingSoonPage = lazy(() => import("@/pages/ComingSoonPage"));
const DailyCheckInRoute = lazy(() => import("@/pages/DailyCheckInRoute"));
const DashboardRoute = lazy(() => import("@/pages/DashboardRoute"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const GoalsPage = lazy(() => import("@/pages/GoalsPage"));
const HabitsPage = lazy(() => import("@/pages/HabitsPage"));
const JournalPage = lazy(() => import("@/pages/JournalPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProfileSettingsPage = lazy(() => import("@/pages/ProfileSettingsPage"));
const ReflectionPage = lazy(() => import("@/pages/ReflectionPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return null;
  // if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAuthenticated) return <HomePage />;
  return (
    <Navigate
      to={user?.profile_complete === false ? "/onboarding" : "/dashboard"}
      replace
    />
  );
}
function OnboardingRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (
    user?.profile_complete &&
    !new URLSearchParams(location.search).has("edit")
  )
    return <Navigate to="/dashboard" replace />;
  return <ProfilePage />;
}
function UserPage({ component: Component }) {
  const { user } = useAuth();
  return <Component user={user} />;
}
const protect = (element, requireProfile = true) => (
  <ProtectedRoute requireProfile={requireProfile}>{element}</ProtectedRoute>
);
const loading = (
  <div className="grid min-h-screen place-items-center">
    <div className="size-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
  </div>
);

export default function App() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={loading}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password/:uid/:token"
            element={<ResetPasswordPage />}
          />
          <Route
            path="/onboarding"
            element={protect(<OnboardingRoute />, false)}
          />
          <Route path="/profile" element={protect(<ProfileSettingsPage />)} />
          <Route path="/dashboard" element={protect(<DashboardRoute />)} />
          <Route path="/check-in" element={protect(<DailyCheckInRoute />)} />
          <Route path="/analytics" element={protect(<AnalyticsPage />)} />
          <Route
            path="/habits"
            element={protect(<UserPage component={HabitsPage} />)}
          />
          <Route
            path="/goals"
            element={protect(<UserPage component={GoalsPage} />)}
          />
          <Route
            path="/journal"
            element={protect(<UserPage component={JournalPage} />)}
          />
          <Route
            path="/reflection"
            element={protect(<UserPage component={ReflectionPage} />)}
          />
          <Route path="/reports" element={protect(<ComingSoonPage />)} />
          <Route path="/resources" element={protect(<ComingSoonPage />)} />
          <Route path="/settings" element={protect(<ComingSoonPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
