import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  DashboardCard,
  DashboardCardContent,
} from "@/components/dashboard/DashboardCard";
import { useAuth } from "@/context/AuthContext";

const labels = {
  "/reports": "Reports",
  "/resources": "Resources",
  "/settings": "Settings",
};
export default function ComingSoonPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const label = labels[pathname] || "This section";
  return (
    <DashboardShell user={user}>
      <DashboardCard className="mx-auto mt-12 max-w-xl">
        <DashboardCardContent className="grid place-items-center px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
            <Construction />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold dark:text-white">
            {label} is planned
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            The route is protected and ready for a later module. Your current
            analytics, check-ins, habits, goals, journal, and reflections remain
            available.
          </p>
        </DashboardCardContent>
      </DashboardCard>
    </DashboardShell>
  );
}
