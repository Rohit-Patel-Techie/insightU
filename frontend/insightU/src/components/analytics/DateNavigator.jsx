import { ChevronLeft, ChevronRight } from "lucide-react"
import { addDays, formatLong, todayKey } from "@/components/analytics/date-utils"

// Top-right selected-date control. Never allows navigating into the future.
export function DateNavigator({ value, onChange, maxDate = todayKey(), className = "" }) {
  const previous = addDays(value, -1)
  const next = addDays(value, 1)
  const nextIsFuture = next > maxDate

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(previous)}
        aria-label={`Previous day, ${formatLong(previous)}`}
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <ChevronLeft className="size-4" />
      </button>

      <label className="relative flex items-center">
        <span className="sr-only">Selected date</span>
        <input
          type="date"
          value={value}
          max={maxDate}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark]"
          aria-label="Choose date"
        />
      </label>

      <button
        type="button"
        onClick={() => !nextIsFuture && onChange(next)}
        disabled={nextIsFuture}
        aria-label={nextIsFuture ? "Next day unavailable" : `Next day, ${formatLong(next)}`}
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <ChevronRight className="size-4" />
      </button>

      {value !== maxDate && (
        <button
          type="button"
          onClick={() => onChange(maxDate)}
          className="ml-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-indigo-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-indigo-400 dark:hover:bg-white/10"
        >
          Today
        </button>
      )}
    </div>
  )
}
