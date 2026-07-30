import { HelpCircle, Info } from "lucide-react";
import {
  DashboardCard as Card,
  DashboardCardContent as CardContent,
  DashboardCardHeader as CardHeader,
  DashboardCardTitle as CardTitle,
} from "@/components/dashboard/DashboardCard";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { UnavailableNote } from "@/components/analytics/AnalyticsStates";

const COMPONENT_LABELS = {
  study_hours: "Study hours",
  study_completion: "Study completion",
  habit: "Habit completion",
  habit_completion: "Habit completion",
  reflection: "Reflection",
  mood: "Mood contribution",
};

// Learning Score = equal mean of the AVAILABLE normalized components x100.
// We surface the exact basis: which components counted, coverage n/5, and a
// low-confidence flag when fewer than five components were available.
export function LearningScoreCard({ score, className, onWhy }) {
  const value = score?.value ?? score?.score ?? null;
  const components = score?.components || {};
  const entries = Object.entries(components);
  const usedCount = entries.filter(([, c]) => c?.available).length;
  const total = entries.length || 5;
  const coverage = score?.components_used || `${usedCount}/${total}`;
  const lowConfidence =
    score?.confidence === "low" || (value != null && usedCount < total);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Learning Score
          {onWhy ? (
            <button
              type="button"
              onClick={onWhy}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-400/10"
              aria-label="Why is this my Learning Score?"
            >
              <HelpCircle className="size-3.5" />
              Why?
            </button>
          ) : (
            <span title="Equal-weighted mean of the components reported that day, scaled to 100.">
              <HelpCircle
                className="size-3.5 text-slate-400"
                aria-hidden="true"
              />
            </span>
          )}
        </CardTitle>
        {value != null && (
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              lowConfidence
                ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
            }`}
          >
            {lowConfidence ? "Low confidence" : "Confident"} · {coverage}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {value == null ? (
          <UnavailableNote>
            No reported components for this day, so the Learning Score
            can&apos;t be calculated.
          </UnavailableNote>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <p className="font-display text-4xl font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                {Math.round(value)}
              </p>
              <p className="pb-1.5 text-sm font-semibold text-slate-400">
                / 100
              </p>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              Based on {coverage} components
              {lowConfidence ? " — treat as indicative, not definitive." : "."}
            </p>

            <ul
              className="mt-4 space-y-2.5"
              aria-label="Learning Score component basis"
            >
              {entries.map(([key, component]) => {
                const baseLabel = COMPONENT_LABELS[key] || key;
                const semantic =
                  key === "mood" && component?.evidence?.mood
                    ? component.evidence.mood.replaceAll("_", " ")
                    : "";
                const label = semantic
                  ? `${baseLabel} (${semantic})`
                  : baseLabel;
                const pct =
                  component?.available &&
                  (component.value ?? component.score) != null
                    ? Math.round((component.value ?? component.score) * 100)
                    : null;
                return (
                  <li key={key}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {label}
                      </span>
                      <span className="font-bold text-slate-400">
                        {component?.available ? `${pct}%` : "Not available"}
                      </span>
                    </div>
                    {component?.available ? (
                      <ProgressBar
                        value={pct}
                        indicatorClassName="bg-indigo-500"
                      />
                    ) : (
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5" />
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
