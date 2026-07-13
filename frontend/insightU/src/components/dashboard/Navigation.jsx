import { NavLink } from "react-router-dom"
import {
  BarChart3, BookOpenText, Bot, CalendarCheck2, CircleUserRound, ClipboardCheck,
  FileBarChart, Flame, Gauge, Goal, Library, Menu, Settings2, Sparkles, X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  { label: "Daily Check-in", path: "/check-in", icon: ClipboardCheck },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Journal", path: "/journal", icon: BookOpenText },
  { label: "Habits", path: "/habits", icon: CalendarCheck2 },
  { label: "Goals", path: "/goals", icon: Goal },
  { label: "AI Reflection", path: "/reflection", icon: Bot },
  { label: "Reports", path: "/reports", icon: FileBarChart },
  { label: "Resources", path: "/resources", icon: Library },
  { label: "Settings", path: "/settings", icon: Settings2 },
]

const bottomItems = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  { label: "Check-in", path: "/check-in", icon: ClipboardCheck },
  { label: "Habits", path: "/habits", icon: CalendarCheck2 },
  { label: "Journal", path: "/journal", icon: BookOpenText },
  { label: "Profile", path: "/profile", icon: CircleUserRound },
]

export function Brand() {
  return (
    <NavLink to="/dashboard" className="flex items-center gap-3" aria-label="InsightU dashboard">
      <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
        <Sparkles className="size-5" />
      </span>
      <div>
        <p className="font-display text-lg font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">InsightU</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Student OS</p>
      </div>
    </NavLink>
  )
}

export function NavLinks({ onNavigate }) {
  return (
    <nav className="space-y-1" aria-label="Primary navigation">
      {navItems.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onNavigate}
          className={({ isActive }) => cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/20"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
          )}
        >
          <Icon className="size-[18px] shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function StreakCard({ compact = false }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"]
  return (
    <div className={cn("rounded-2xl border border-orange-200/60 bg-orange-50 p-4 dark:border-orange-300/10 dark:bg-orange-400/[0.07]", compact && "p-3.5")}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400">
          <Flame className="size-5 fill-current" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">7 Day Streak</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Keep going! You&apos;re doing great.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Six of seven streak days complete">
        {days.map((day, index) => (
          <div key={`${day}-${index}`} className="text-center">
            <span className={cn("mx-auto grid size-6 place-items-center rounded-full text-[9px] font-bold", index < 6 ? "bg-emerald-500 text-white" : "border border-slate-300 text-slate-400 dark:border-white/20")}>{index < 6 ? "✓" : ""}</span>
            <span className="mt-1 block text-[9px] font-semibold text-slate-400">{day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DesktopSidebar({ user }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-slate-200/80 bg-white px-4 py-5 dark:border-white/[0.07] dark:bg-[#0d1020] lg:flex">
      <div className="px-2"><Brand /></div>
      <div className="scrollbar-none mt-7 flex-1 overflow-y-auto"><NavLinks /></div>
      <div className="space-y-3 pt-4">
        <StreakCard compact />
        <NavLink to="/profile" className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white">{user.initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user.course}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}

export function MobileDrawer({ open, onClose, user }) {
  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <button className={cn("absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="Close navigation" />
      <aside className={cn("absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col bg-white p-5 shadow-2xl transition-transform duration-300 dark:bg-[#0d1020]", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between">
          <Brand />
          <button onClick={onClose} className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <div className="scrollbar-none mt-7 flex-1 overflow-y-auto"><NavLinks onNavigate={onClose} /></div>
        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <div className="grid size-10 place-items-center rounded-xl bg-indigo-500 text-sm font-bold text-white">{user.initials}</div>
          <div><p className="text-sm font-bold dark:text-white">{user.name}</p><p className="text-xs text-slate-400">{user.course}</p></div>
        </div>
      </aside>
    </div>
  )
}

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1020]/95 lg:hidden" aria-label="Mobile navigation">
      {bottomItems.map(({ label, path, icon: Icon }) => (
        <NavLink key={path} to={path} className={({ isActive }) => cn("flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")}>
          <Icon className="size-5" />{label}
        </NavLink>
      ))}
    </nav>
  )
}

export function MobileMenuButton({ onClick }) {
  return <button onClick={onClick} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
}
