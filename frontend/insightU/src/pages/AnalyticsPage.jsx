import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  DashboardCard as Card,
  DashboardCardContent as CardContent,
  DashboardCardHeader as CardHeader,
  DashboardCardTitle as CardTitle,
} from "@/components/dashboard/DashboardCard";
import { DateNavigator } from "@/components/analytics/DateNavigator";
import {
  ErrorState,
  LoadingState,
} from "@/components/analytics/AnalyticsStates";
import {
  DistractionFrequencyChart,
  FocusDistributionChart,
  HabitCompletionChart,
  LearningScoreTrendChart,
  MoodTrendChart,
  StudyTrendChart,
} from "@/components/analytics/AnalyticsCharts";
import { useAnalyticsData } from "@/components/analytics/useAnalyticsData";
import {
  getOverview,
  getAnalyticsErrorMessage,
} from "@/services/analytics-api";
import {
  selectDistractions,
  selectFocusDistribution,
  selectHabitSummary,
  selectLearningScoreTrend,
  selectMoodTrend,
  selectStudyTrend,
} from "@/components/analytics/selectors";
import { todayKey } from "@/components/analytics/date-utils";
import { cn } from "@/lib/utils";
import { AIInsightCard } from "@/components/ai/AIInsight";
import { useAIInsight } from "@/hooks/useAIInsight";
import { AI_SERVICES } from "@/services/ai-api";

function SummaryMetric({ label, value, suffix = "", note }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="font-display mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">
          {value ?? "—"}
          <span className="text-sm text-slate-400">
            {value != null ? suffix : ""}
          </span>
        </p>
        {note && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GrowthMetric({ label, metric }) {
  const available = metric?.available && metric.value != null;
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-extrabold ${available && metric.value > 0 ? "text-emerald-600" : available && metric.value < 0 ? "text-rose-600" : "text-slate-700 dark:text-slate-200"}`}
      >
        {available
          ? `${metric.value > 0 ? "+" : ""}${metric.value}%`
          : "No comparison"}
      </p>
    </div>
  );
}

const fetchOverview = (period, anchorDate) =>
  getOverview({ period, anchorDate });

const PERIODS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

function TrendBadge({ direction }) {
  if (!direction) return null;
  const styles = {
    increasing:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    decreasing:
      "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    stable: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  };
  const label =
    {
      increasing: "Trending up",
      decreasing: "Trending down",
      stable: "Stable",
    }[direction] || direction;
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold",
        styles[direction] || styles.stable,
      )}
    >
      {label}
    </span>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("week");
  const maxDate = todayKey(user?.timezone);
  const [anchorDate, setAnchorDate] = useState(maxDate);

  const overviewData = useAnalyticsData(fetchOverview, [period, anchorDate]);
  const overview = overviewData.data || {};

  const scoreTrend = selectLearningScoreTrend(overview);
  const studyTrend = selectStudyTrend(overview);
  const moodTrend = selectMoodTrend(overview);
  const focus = selectFocusDistribution(overview);
  const habits = selectHabitSummary(overview);
  const distractions = selectDistractions(overview);
  const coverage = overview.coverage || {};
  const weeklyCoach = useAIInsight({
    service: AI_SERVICES.WEEKLY_COACH,
    anchorDate,
    enabled: !overviewData.loading && period === "week",
  });
  const patterns = useAIInsight({
    service: AI_SERVICES.PATTERN_DISCOVERY,
    anchorDate,
    enabled: !overviewData.loading,
  });

  return (
    <DashboardShell user={user}>
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
              Analytics
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Insights from your reported check-ins.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Period"
              className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5"
            >
              {PERIODS.map((item) => (
                <button
                  key={item.key}
                  role="tab"
                  aria-selected={period === item.key}
                  onClick={() => setPeriod(item.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    period === item.key
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <DateNavigator
              value={anchorDate}
              onChange={setAnchorDate}
              maxDate={maxDate}
            />
          </div>
        </div>

        {overviewData.loading ? (
          <Card>
            <CardContent>
              <LoadingState label="Loading analytics…" />
            </CardContent>
          </Card>
        ) : overviewData.error ? (
          <Card>
            <CardContent>
              <ErrorState
                message={getAnalyticsErrorMessage(overviewData.error)}
                onRetry={overviewData.refetch}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {coverage.total_days != null && (
              <p className="text-xs font-medium text-blue-500 dark:text-blue-500">
                {coverage.reported_days ?? 0} of {coverage.total_days} days
                reported this {period}
                {coverage.missing_days
                  ? ` · ${coverage.missing_days} missed`
                  : ""}
                .
              </p>
            )}

            <section
              className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              aria-label="Period summary"
            >
              <SummaryMetric
                label="Recorded study"
                value={overview.summary?.total_study_hours}
                suffix=" hrs"
                note={`${overview.summary?.study_days ?? 0} study days`}
              />
              <SummaryMetric
                label="Average study"
                value={overview.summary?.average_study_hours}
                suffix=" hrs"
                note="Per reported day"
              />
              <SummaryMetric
                label="Learning Score"
                value={overview.average_learning_score}
                suffix="/100"
                note={overview.learning_score_trend?.direction?.replaceAll(
                  "_",
                  " ",
                )}
              />
              <SummaryMetric
                label="Coverage"
                value={overview.summary?.coverage_pct}
                suffix="%"
                note={`${coverage.reported_days ?? 0}/${coverage.total_days ?? 0} days reported`}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-6">
                <CardHeader>
                  <CardTitle>Learning Score trend</CardTitle>
                  <TrendBadge direction={scoreTrend.direction} />
                </CardHeader>
                <CardContent>
                  <LearningScoreTrendChart data={scoreTrend.points} />
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden xl:col-span-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-500 via-emerald-400 to-amber-400" />
                <CardHeader>
                  <div>
                    <CardTitle className="font-display text-base">
                      Focus distribution
                    </CardTitle>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      How reported focus levels divide across this {period}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <FocusDistributionChart
                    data={focus.buckets}
                    average={focus.average}
                  />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-6">
                <CardHeader>
                  <CardTitle>Habit completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <HabitCompletionChart data={habits} />
                </CardContent>
              </Card>
              <Card className="xl:col-span-6">
                <CardHeader>
                  <CardTitle>Top distractions (frequency)</CardTitle>
                </CardHeader>
                <CardContent>
                  <DistractionFrequencyChart data={distractions} />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {period === "week" && (
                <AIInsightCard
                  title="Weekly Coach"
                  description="The backend checks eligibility for the selected week."
                  insight={weeklyCoach}
                  className="xl:col-span-5"
                  waitingLabel="Keep reporting check-ins to unlock this week's coaching."
                />
              )}
              <AIInsightCard
                title="Pattern Discovery"
                description="Patterns use the backend's rolling recent window, independent of this chart period."
                insight={patterns}
                className={
                  period === "week" ? "xl:col-span-7" : "xl:col-span-12"
                }
                waitingLabel="Keep reporting check-ins to build enough rolling-window evidence."
              />
            </section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-7">
                <CardHeader>
                  <CardTitle>Study hours &amp; focus</CardTitle>
                </CardHeader>
                <CardContent>
                  <StudyTrendChart data={studyTrend} />
                </CardContent>
              </Card>
              <Card className="xl:col-span-5">
                <CardHeader>
                  <CardTitle>Mood trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <MoodTrendChart data={moodTrend} />
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-4">
                <CardHeader>
                  <CardTitle>Period comparison</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <GrowthMetric
                    label="Study growth"
                    metric={overview.comparison?.study_hours}
                  />
                  <GrowthMetric
                    label="Habit growth"
                    metric={overview.comparison?.habit_completion}
                  />
                  <GrowthMetric
                    label="Score growth"
                    metric={overview.comparison?.learning_score}
                  />
                  <GrowthMetric
                    label="Consistency"
                    metric={overview.comparison?.coverage}
                  />
                </CardContent>
              </Card>
              <Card className="xl:col-span-4">
                <CardHeader>
                  <CardTitle>Goal evidence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {overview.goal_alignment?.length ? (
                    overview.goal_alignment.map((goal) => (
                      <div
                        key={goal.goal_id}
                        className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]"
                      >
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {goal.title}
                          </p>
                          <span className="text-sm font-extrabold text-sky-600">
                            {goal.alignment?.available
                              ? `${Math.round(goal.alignment.score)}%`
                              : "—"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {goal.alignment?.components_used || "0/3"} evidence
                          components
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No configured goals or evidence in this period.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="xl:col-span-4">
                <CardHeader>
                  <CardTitle>Reflection &amp; Distraction Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Recurring themes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(overview.reflection_themes?.themes || {})
                      .length ? (
                      Object.entries(overview.reflection_themes.themes).map(
                        ([theme, count]) => (
                          <span
                            key={theme}
                            className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
                          >
                            {theme.replaceAll("_", " ")} · {count}
                          </span>
                        ),
                      )
                    ) : (
                      <span className="text-xs text-slate-400">
                        No recurring themes yet.
                      </span>
                    )}
                  </div>
                  <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Most Distracted time
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {Object.entries(overview.distractions?.by_time || {}).sort(
                      (a, b) => b[1] - a[1],
                    )[0]?.[1]
                      ? Object.entries(overview.distractions.by_time)
                          .sort((a, b) => b[1] - a[1])[0][0]
                          .replaceAll("_", " ")
                      : "Not reported"}
                  </p>
                  {/* <p className="mt-1 text-[11px] text-slate-400">
                    Frequency only—no duration is inferred.
                  </p> */}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
