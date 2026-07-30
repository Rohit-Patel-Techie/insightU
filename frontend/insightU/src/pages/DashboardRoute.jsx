import { useAuth } from "@/context/AuthContext";
import DashboardPage from "@/pages/DashboardPage";

export default function DashboardRoute() {
  const { user } = useAuth();
  return <DashboardPage user={user} />;
}
