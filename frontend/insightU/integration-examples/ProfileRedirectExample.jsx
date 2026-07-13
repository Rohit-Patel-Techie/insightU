import { useNavigate } from "react-router-dom"

export function useDashboardRedirect() {
  const navigate = useNavigate()
  return () => navigate("/dashboard", { replace: true })
}
