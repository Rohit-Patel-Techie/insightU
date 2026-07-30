import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  currentMonthKey,
  formatMonthLabel,
  todayKey,
} from "@/components/analytics/date-utils";
import { cn } from "@/lib/utils";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

// Renders a calendar month with per-day check-in status and click-to-select.
// `days` is a map keyed by date string -> { status, learning_score, is_planned_day }.
export function StatusCalendar({
  month,
  days = {},
  selectedDate,
  onSelectDate,
  onMonthChange,
  maxDate = todayKey(),
  className,
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const first = new Date(year, monthNum - 1, 1);
  const leadingBlanks = first.getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const today = maxDate;
  const atCurrentMonth = month >= currentMonthKey();

  const cells = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const statusStyle = (status) => {
    switch (status) {
      case "reported":
        return "bg-emerald-500 text-white";
      case "not_reported":
        return "bg-rose-100 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300";
      case "not_planned":
        return "text-slate-400 dark:text-slate-500";
      default:
        return "text-slate-300 dark:text-slate-600";
    }
  };

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange?.(addMonths(month, -1))}
          aria-label="Previous month"
          className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {formatMonthLabel(month)}
        </p>
        <button
          type="button"
          onClick={() =>
            !atCurrentMonth && onMonthChange?.(addMonths(month, 1))
          }
          disabled={atCurrentMonth}
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="py-1 text-[9px] font-bold text-slate-400"
          >
            {d}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`b-${index}`} className="invisible" />;
          const key = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const info = days[key] || {};
          const isFuture = key > today;
          const isSelected = key === selectedDate;
          const status = isFuture
            ? "future"
            : info.status ||
              (info.is_planned_day === false ? "not_planned" : "not_reported");
          const label = `${formatMonthLabel(month)} ${day}${info.status === "reported" ? `, reported${info.learning_score != null ? `, score ${Math.round(info.learning_score)}` : ""}` : isFuture ? ", upcoming" : status === "not_planned" ? ", rest day" : ", not reported"}`;
          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate?.(key)}
              aria-label={label}
              aria-pressed={isSelected}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-[10px] font-semibold transition",
                statusStyle(status),
                !isFuture && "hover:ring-2 hover:ring-indigo-400/40",
                isFuture && "cursor-not-allowed",
                isSelected &&
                  "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-[#151827]",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          Reported
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-300 dark:bg-rose-400/40" />
          Not reported
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-200 dark:bg-white/10" />
          Rest / upcoming
        </span>
      </div>
    </div>
  );
}

export function CheckInStatusBanner({ reported, isPlannedDay, dateLabel }) {
  if (reported) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-400/[0.07]">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          Check-in recorded for {dateLabel}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
      <span className="size-4 shrink-0 rounded-full border-2 border-slate-300 dark:border-white/20" />
      <p className="text-[12px] font-semibold text-orange-500 dark:text-orange-500">
        {isPlannedDay === false
          ? `Rest day — no check-in expected for ${dateLabel}`
          : `No check-in yet for ${dateLabel}`}
      </p>
    </div>
  );
}
