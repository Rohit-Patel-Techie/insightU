import { CalendarDays, Clock3, History, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileMenuButton } from "@/components/dashboard/Navigation";

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function CheckInHeader({ user, theme, onThemeToggle, onMenuOpen }) {
  return (
    <header>
      <div className="flex items-center gap-3 xl:hidden">
        <MobileMenuButton onClick={onMenuOpen} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-400">
            Welcome, {user.firstName}
          </p>
          <h1 className="font-display truncate text-xl font-extrabold tracking-[-0.03em] text-slate-950 dark:text-white">
            Daily Check-in
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </Button>
      </div>

      <div className="hidden items-end justify-between gap-6 xl:flex">
        <div>
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
            Daily Check-in
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your daily reflection helps you grow and stay consistent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            <CalendarDays className="size-4" />
            {todayLabel()}
          </div>
          <Button
            variant="outline"
            disabled
            title="History will be connected later"
          >
            <History className="size-4" />
            View History
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? (
              <Sun className="size-5" />
            ) : (
              <Moon className="size-5" />
            )}
          </Button>
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-white">
            {user.initials}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs font-medium text-indigo-700 dark:border-indigo-400/10 dark:bg-indigo-400/[0.07] dark:text-indigo-300 xl:hidden">
        <Clock3 className="size-4" />
        Today · {todayLabel()}
      </div>
    </header>
  );
}
