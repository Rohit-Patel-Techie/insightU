import { AlertTriangle, CalendarOff, Loader2, LineChart, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// Honest, non-fabricated states shared across the analytics UI. None of these
// invent numbers — they explain exactly why a value is unavailable.

export function LoadingState({ label = "Loading analytics…", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-slate-500 dark:text-slate-400", className)} role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-indigo-500" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 px-5 py-8 text-center dark:border-rose-400/20 dark:bg-rose-400/[0.06]", className)} role="alert">
      <AlertTriangle className="size-6 text-rose-500" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Couldn&apos;t load this data</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message || "Something went wrong. Please try again."}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600">
          Try again
        </button>
      )}
    </div>
  )
}

// A reported check-in simply does not exist for this date. Distinct from an error.
export function NotReportedState({ dateLabel, isPlannedDay = true, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center dark:border-white/10", className)}>
      <CalendarOff className="size-6 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not reported</p>
      <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
        {dateLabel ? `No check-in was recorded on ${dateLabel}.` : "No check-in was recorded for this day."}
        {isPlannedDay ? " This day counts as missed for streaks and coverage." : " This wasn't a planned study day."}
      </p>
    </div>
  )
}

// Not enough reported points to compute a trend safely (contract: >= 4 points).
export function InsufficientDataState({ reason, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center dark:border-white/10", className)}>
      <LineChart className="size-6 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Not enough data yet</p>
      <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
        {reason || "Trends need at least 4 reported days. Keep checking in to unlock this view."}
      </p>
    </div>
  )
}

// A metric can't be computed for this specific day (e.g. rest day, no habits due).
export function UnavailableNote({ children, className }) {
  return (
    <p className={cn("text-xs italic text-slate-400 dark:text-slate-500", className)}>
      {children || "Not enough information to calculate this."}
    </p>
  )
}

// A feature (e.g. goals) has not been configured yet, so there's nothing to show.
export function NotConfiguredState({ title = "Nothing configured yet", message, actionLabel, onAction, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center dark:border-white/10", className)}>
      <Sparkles className="size-6 text-indigo-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {message && <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">{message}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
