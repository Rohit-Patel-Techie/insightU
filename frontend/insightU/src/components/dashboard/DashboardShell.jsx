import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  DesktopSidebar,
  MobileBottomNav,
  MobileDrawer,
} from "@/components/dashboard/Navigation";
import { useAuth } from "@/context/AuthContext";

function normalizeUser(user = {}) {
  const firstName =
    user.first_name || user.firstName || user.username || "Student";
  const lastName = user.last_name || user.lastName || "";
  const name =
    user.full_name ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Student";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return {
    firstName,
    name,
    initials: initials || "ST",
    course: user.course || user.program || "College Student",
  };
}

function initialTheme() {
  try {
    const saved = localStorage.getItem("insightu-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Use the responsive default when browser storage is blocked. */
  }
  return window.innerWidth >= 1024 ? "dark" : "light";
}

export function DashboardShell({
  user,
  children,
  header,
  showMobileNav = true,
}) {
  const dashboardUser = useMemo(() => normalizeUser(user), [user]);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("insightu-theme", theme);
    } catch {
      /* Theme still works for the current session. */
    }
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    const closeOnEscape = (event) =>
      event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const headerProps = {
    user: dashboardUser,
    theme,
    onThemeToggle: () =>
      setTheme((value) => (value === "dark" ? "light" : "dark")),
    onMenuOpen: () => setMenuOpen(true),
  };

  return (
    <div
      className={theme === "dark" ? "dark" : ""}
      style={{ colorScheme: theme }}
    >
      <div className="dashboard-grid min-h-screen bg-[#f5f7fb] text-slate-900 transition-colors dark:bg-[#101321] dark:text-slate-100">
        <DesktopSidebar
          user={dashboardUser}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <MobileDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          user={dashboardUser}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <div
          className={
            showMobileNav
              ? "min-h-screen pb-24 lg:ml-[260px] lg:pb-0"
              : "min-h-screen lg:ml-[260px]"
          }
        >
          <div className="mx-auto max-w-[1640px] p-4 sm:p-6 lg:p-8">
            {typeof header === "function"
              ? header(headerProps)
              : header || <DashboardHeader {...headerProps} />}
            <main className="mt-6">
              {typeof children === "function"
                ? children(dashboardUser)
                : children}
            </main>
          </div>
        </div>
        {showMobileNav && <MobileBottomNav />}
      </div>
    </div>
  );
}
