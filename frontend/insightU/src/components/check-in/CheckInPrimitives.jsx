import { Check, CircleAlert } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { cn } from "@/lib/utils";

const selectedTone = {
  indigo:
    "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-400/10 dark:text-indigo-200",
  emerald:
    "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/10 dark:text-emerald-200",
  amber:
    "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/10 dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-200",
  rose: "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/10 dark:border-rose-400 dark:bg-rose-400/10 dark:text-rose-200",
};

const gridClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3",
};

export function CheckInCard({
  step,
  title,
  helper,
  emoji,
  children,
  className,
}) {
  return (
    <DashboardCard className={cn("overflow-hidden xl:h-full", className)}>
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-transparent px-5 py-4 dark:border-white/[0.07] dark:from-indigo-400/[0.08]">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm dark:bg-white/[0.07]">
            {emoji}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
              Step {step}
            </p>
            <h2 className="font-display mt-0.5 text-base font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {helper}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-5">{children}</div>
    </DashboardCard>
  );
}

export function Question({ label, hint, children }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">
        {label}
      </legend>
      {hint && (
        <p className="mt-1 text-[11px] leading-4 text-slate-400">{hint}</p>
      )}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

export function FieldError({ message }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
    >
      <CircleAlert className="size-3.5" />
      {message}
    </p>
  );
}

export function OptionGrid({
  options,
  value,
  onChange,
  columns = 3,
  multiple = false,
  ariaLabel,
}) {
  const values = multiple ? value : [value];
  return (
    <div
      className={cn("grid gap-2.5", gridClasses[columns] || gridClasses[3])}
      role={multiple ? "group" : "radiogroup"}
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = values.includes(option.value);
        const tone = option.tone || "indigo";
        return (
          <button
            type="button"
            key={option.value}
            role={multiple ? "checkbox" : "radio"}
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center transition hover:-translate-y-0.5 hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-white/[0.035]",
              selected && selectedTone[tone],
            )}
          >
            {selected && (
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-indigo-600 text-white">
                <Check className="size-2.5" />
              </span>
            )}
            <span className="text-xl" aria-hidden="true">
              {option.emoji}
            </span>
            <span className="break-words text-[11px] font-bold leading-4">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FocusScale({ options, value, onChange }) {
  return (
    <div
      className="grid grid-cols-5 gap-1.5"
      role="radiogroup"
      aria-label="Focus level"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="group min-w-0 rounded-xl px-0.5 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span
              className={cn(
                "mx-auto grid size-10 place-items-center rounded-full border text-lg transition",
                selected
                  ? "border-indigo-500 bg-indigo-600 shadow-lg shadow-indigo-500/20"
                  : "border-slate-200 bg-slate-50 group-hover:border-indigo-300 dark:border-white/10 dark:bg-white/[0.04]",
              )}
            >
              {option.emoji}
            </span>
            <span
              className={cn(
                "mt-1.5 block text-[9px] font-bold leading-3 sm:text-[10px]",
                selected
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400",
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function HabitGrid({ options, selectedValues, onToggle }) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2"
      role="group"
      aria-label="Habits completed"
    >
      {options.map((option) => {
        const selected = selectedValues.includes(option.value);
        return (
          <button
            type="button"
            key={option.value}
            role="checkbox"
            aria-checked={selected}
            onClick={() => onToggle(option.value)}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              selected
                ? "border-emerald-400 bg-emerald-50 dark:border-emerald-400/50 dark:bg-emerald-400/10"
                : "border-slate-200 bg-white hover:border-indigo-300 dark:border-white/10 dark:bg-white/[0.035]",
            )}
          >
            <span className="text-lg" aria-hidden="true">
              {option.emoji}
            </span>
            <span className="min-w-0 flex-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              {option.label}
            </span>
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-md border",
                selected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 dark:border-white/20",
              )}
            >
              {selected && <Check className="size-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
