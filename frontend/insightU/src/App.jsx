import { Navigate, Route, Routes } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import DashboardPage from "@/pages/DashboardPage"
import ProfilePage from "@/pages/ProfilePage"

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      {/* Matches the link the backend emails: FRONTEND_URL/reset-password/<uid>/<token>/ */}
      <Route
        path="/reset-password/:uid/:token"
        element={<ResetPasswordPage />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
            <ProfilePage />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}