import { Check } from "lucide-react";
import { checkInSteps } from "@/data/check-in-data";
import { cn } from "@/lib/utils";

export function DesktopCheckInStepper({ currentStep, completedSteps }) {
  return (
    <ol
      className="grid grid-cols-6 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm dark:border-white/[0.08] dark:bg-[#151827]"
      aria-label="Check-in progress"
    >
      {checkInSteps.map((step, index) => {
        const completed = step.id < currentStep || completedSteps.has(step.id);
        const active = step.id === currentStep;
        return (
          <li
            key={step.id}
            className="relative flex min-w-0 flex-col items-center text-center"
          >
            {index > 0 && (
              <span
                className={cn(
                  "absolute right-1/2 top-4 h-0.5 w-full",
                  step.id <= currentStep
                    ? "bg-indigo-500"
                    : "bg-slate-200 dark:bg-white/10",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-extrabold",
                completed
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : active
                    ? "border-indigo-500 bg-white text-indigo-600 dark:bg-[#151827] dark:text-indigo-400"
                    : "border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-[#151827]",
              )}
            >
              {completed ? <Check className="size-4" /> : step.id}
            </span>
            <span
              className={cn(
                "relative z-10 mt-2 truncate text-[10px] font-bold sm:text-[11px]",
                completed || active
                  ? "text-slate-800 dark:text-slate-200"
                  : "text-slate-400",
              )}
            >
              {step.shortTitle}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function MobileCheckInProgress({ currentStep }) {
  const step = checkInSteps[currentStep - 1];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#151827] xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          Step {currentStep} of {checkInSteps.length}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {step.title} {step.emoji}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-[width] duration-500"
          style={{ width: `${(currentStep / checkInSteps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
