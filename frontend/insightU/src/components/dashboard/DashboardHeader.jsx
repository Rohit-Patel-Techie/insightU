import {
  Bell,
  CircleHelp,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileMenuButton } from "@/components/dashboard/Navigation";

function formatDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function greetingForHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader({ user, theme, onThemeToggle, onMenuOpen }) {
  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <MobileMenuButton onClick={onMenuOpen} />
        <label className="relative hidden w-full max-w-md lg:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search dashboard"
            placeholder="Search anything..."
            className="h-11 w-full rounded-2xl border border-slate-200/80 bg-white pl-10 pr-11 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white dark:placeholder:text-slate-500"
          />
          <SlidersHorizontal className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#111422]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden rounded-xl sm:inline-flex"
            aria-label="Help"
          >
            <CircleHelp className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? (
              <Sun className="size-5" />
            ) : (
              <Moon className="size-5" />
            )}
          </Button>
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white lg:hidden">
            {user.initials}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[28px]">
            {greetingForHour()}, {user.firstName}!{" "}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Stay consistent today, achieve tomorrow.
          </p>
        </div>
        <p className="hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 sm:block">
          {formatDate()}
        </p>
      </div>
    </header>
  );
}
