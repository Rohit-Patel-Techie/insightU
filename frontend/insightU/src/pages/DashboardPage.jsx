import { useEffect, useState } from "react";
import {
  Bot,
  BookOpenText,
  CalendarCheck2,
  ClipboardCheck,
  Goal,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  DashboardCard as Card,
  DashboardCardContent as CardContent,
  DashboardCardHeader as CardHeader,
  DashboardCardTitle as CardTitle,
} from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { DateNavigator } from "@/components/analytics/DateNavigator";
import { LearningScoreCard } from "@/components/analytics/LearningScoreCard";
import { LearningScoreTrendChart } from "@/components/analytics/AnalyticsCharts";
import {
  CheckInStatusBanner,
  StatusCalendar,
} from "@/components/analytics/StatusCalendar";
import { MetricTile } from "@/components/analytics/DashboardMetrics";
import { HabitsDistractionsVisual } from "@/components/analytics/HabitsDistractionsVisual";
import {
  ErrorState,
  LoadingState,
  NotReportedState,
} from "@/components/analytics/AnalyticsStates";
import {
  CombinedCoachCard,
  AIEnvelopeContent,
  AIInsightCard,
} from "@/components/ai/AIInsight";
import { Modal } from "@/components/behavior/BehaviorUI";
import { useAIInsight } from "@/hooks/useAIInsight";
import { AI_SERVICES } from "@/services/ai-api";
import { useAnalyticsData } from "@/components/analytics/useAnalyticsData";
import {
  getAnalyticsCalendar,
  getDashboard,
  getAnalyticsErrorMessage,
} from "@/services/analytics-api";
import {
  MOOD_EMOJI,
  MOOD_LABELS,
  STUDY_STATUS_LABELS,
  selectDistractions,
  titleize,
} from "@/components/analytics/selectors";
import {
  formatLong,
  monthKeyOf,
  todayKey,
} from "@/components/analytics/date-utils";

function toCalendarMap(calendar) {
  const days = calendar?.days || calendar?.results || [];
  const map = {};
  days.forEach((day) => {
    if (day?.date) map[day.date] = day;
  });
  return map;
}

export default function DashboardPage({ user }) {
  const maxDate = todayKey(user?.timezone);
  const [selectedDate, setSelectedDate] = useState(maxDate);
  const [whyOpen, setWhyOpen] = useState(false);
  const month = monthKeyOf(selectedDate);

  const dashboard = useAnalyticsData(getDashboard, [selectedDate]);
  const [calMonth, setCalMonth] = useState(month);
  const calendar = useAnalyticsData(getAnalyticsCalendar, [calMonth]);
  const refetchDashboard = dashboard.refetch;
  const refetchCalendar = calendar.refetch;
  useEffect(() => {
    const refresh = () => {
      refetchDashboard();
      refetchCalendar();
    };
    window.addEventListener("insightu:checkin-saved", refresh);
    return () => window.removeEventListener("insightu:checkin-saved", refresh);
  }, [refetchDashboard, refetchCalendar]);

  const selectDate = (value) => {
    setSelectedDate(value);
    setCalMonth(monthKeyOf(value));
  };

  const data = dashboard.data || {};
  const reported = !!data.reported;
  const dailyCoach = useAIInsight({
    service: AI_SERVICES.DAILY_COACH,
    anchorDate: selectedDate,
    enabled: !dashboard.loading && reported,
  });
  const scoreExplanation = useAIInsight({
    service: AI_SERVICES.SCORE_EXPLANATION,
    anchorDate: selectedDate,
    enabled:
      whyOpen &&
      !dashboard.loading &&
      reported &&
      data.learning_score?.score != null,
  });
  const weeklyCoach = useAIInsight({
    service: AI_SERVICES.WEEKLY_COACH,
    anchorDate: selectedDate,
    enabled: !dashboard.loading,
  });
  const dateLabel = formatLong(selectedDate);
  const distractions = selectDistractions(data);

  return (
    <DashboardShell user={user}>
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
              Your Day in Brief
            </h2>
            <p className="text-xs font-medium text-blue-500 dark:text-blue-400">
              {dateLabel}
            </p>
          </div>
          <DateNavigator
            value={selectedDate}
            onChange={selectDate}
            maxDate={maxDate}
            className="sm:justify-end"
          />
        </div>

        {dashboard.loading ? (
          <Card>
            <CardContent>
              <LoadingState label="Loading your day…" />
            </CardContent>
          </Card>
        ) : dashboard.error ? (
          <Card>
            <CardContent>
              <ErrorState
                message={getAnalyticsErrorMessage(dashboard.error)}
                onRetry={dashboard.refetch}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <CheckInStatusBanner
              reported={reported}
              isPlannedDay={data.is_planned_day}
              dateLabel={dateLabel}
            />

            {/* Metric tiles: honest availability, counts not durations */}
            <section
              className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6"
              aria-label="Selected-day metrics"
            >
              <MetricTile
                animationKey={selectedDate}
                id="learning"
                label="Learning Score"
                available={data.learning_score?.score != null}
                value={
                  data.learning_score?.score != null
                    ? Math.round(data.learning_score.score)
                    : null
                }
                suffix="/100"
                hint={`${data.learning_score?.components_used || "0/5"} components`}
                unavailableNote="No score for an unreported day."
              />
              <MetricTile
                animationKey={selectedDate}
                id="study"
                label="Study hours"
                available={data.study?.hours != null}
                value={
                  data.study?.hours != null
                    ? Number(data.study.hours).toFixed(1)
                    : null
                }
                suffix=" hrs"
                hint={
                  data.study?.completion_status
                    ? STUDY_STATUS_LABELS[data.study.completion_status]
                    : null
                }
                unavailableNote="No study hours reported."
              />
              <MetricTile
                animationKey={selectedDate}
                id="habits"
                label="Habit completion"
                available={!!data.habits?.available}
                value={
                  data.habits?.available
                    ? `${data.habits.completed ?? 0}/${data.habits.scheduled ?? 0}`
                    : null
                }
                suffix=""
                hint="Completed of scheduled"
                unavailableNote="No habits scheduled this day."
              />
              <MetricTile
                animationKey={selectedDate}
                id="goals"
                label="Goal alignment"
                available={!!data.goal_alignment?.available}
                value={
                  data.goal_alignment?.value != null
                    ? Math.round(data.goal_alignment.value * 100)
                    : null
                }
                suffix="%"
                hint={
                  data.goal_alignment?.configured
                    ? "Evidence-based"
                    : "No goals configured"
                }
                unavailableNote="No aligned goal evidence."
              />
              <MetricTile
                animationKey={selectedDate}
                id="mood"
                label="Mood"
                available={!!data.mood?.available}
                value={
                  data.mood?.label
                    ? MOOD_LABELS[data.mood.label] || titleize(data.mood.label)
                    : null
                }
                suffix={
                  data.mood?.label && MOOD_EMOJI[data.mood.label]
                    ? ` ${MOOD_EMOJI[data.mood.label]}`
                    : ""
                }
                unavailableNote="Mood not reported this day."
              />
              <MetricTile
                animationKey={selectedDate}
                id="streak"
                label="Check-in streak"
                available
                value={data.streak ?? 0}
                suffix={data.streak === 1 ? " day" : " days"}
                hint="Consecutive reported days"
              />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <LearningScoreCard
                score={data.learning_score}
                className="xl:col-span-4"
                onWhy={
                  data.learning_score?.score != null
                    ? () => setWhyOpen(true)
                    : undefined
                }
              />

              {/* Selected-day detail */}
              <Card className="relative overflow-hidden xl:col-span-8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-400 via-sky-400 to-rose-400" />
                <CardHeader>
                  <div>
                    <CardTitle className="font-display text-base">
                      Habits &amp; distractions
                    </CardTitle>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      Visual signals of the selected day
                    </p>
                  </div>
                  <Link
                    to="/habits"
                    className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-extrabold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-300"
                  >
                    Manage
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!reported ? (
                    <NotReportedState
                      dateLabel={dateLabel}
                      isPlannedDay={data.is_planned_day}
                      className="border-0 py-2"
                    />
                  ) : (
                    <HabitsDistractionsVisual
                      habits={data.habits}
                      distractions={distractions}
                    />
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <CombinedCoachCard
                insight={dailyCoach}
                className="xl:col-span-8"
              />
              <AIInsightCard
                title="Weekly Coach"
                description="The backend checks this week's reported-day eligibility."
                insight={weeklyCoach}
                className="xl:col-span-4"
                waitingLabel="Keep reporting check-ins to unlock this week's coaching."
              />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-8">
                <CardHeader>
                  <CardTitle>Learning Score · 7 days</CardTitle>
                  <Link
                    to="/analytics"
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    Full analytics
                  </Link>
                </CardHeader>
                <CardContent>
                  <LearningScoreTrendChart
                    height={190}
                    data={(data.seven_day?.series || []).map((item) => ({
                      ...item,
                      value: item.score,
                      label: item.date?.slice(5),
                    }))}
                  />
                </CardContent>
              </Card>
              <Card className="xl:col-span-4">
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {[
                    ["/check-in", "Daily check-in", ClipboardCheck],
                    ["/journal", "Write journal", BookOpenText],
                    ["/habits", "Track habits", CalendarCheck2],
                    ["/goals", "Update goals", Goal],
                  ].map(([path, label, Icon]) => (
                    <Link
                      key={path}
                      to={path}
                      className="flex min-h-24 flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-white dark:border-white/[0.06] dark:bg-white/[0.035] dark:text-slate-200"
                    >
                      <span className="grid size-9 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
                        <Icon className="size-4" />
                      </span>
                      {label}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* AI reflection snippet */}
              <Card className="relative overflow-hidden xl:col-span-8">
                <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-indigo-500/10 blur-3xl" />
                <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="relative grid size-16 shrink-0 place-items-center rounded-[20px] bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 text-white shadow-lg shadow-indigo-500/20">
                    <Bot className="size-8" />
                    <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-white text-indigo-600 shadow">
                      <Sparkles className="size-3" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">AI reflection</CardTitle>
                      <Link
                        to="/reflection"
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
                      >
                        Open
                      </Link>
                    </div>
                    {data.ai_reflection?.summary ? (
                      <>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {data.ai_reflection.summary}
                        </p>
                        {data.reflection_themes?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {data.reflection_themes.map((theme) => (
                              <Badge
                                key={theme}
                                className="bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"
                              >
                                {titleize(theme)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">
                        {reported
                          ? "No reflection generated yet for this day. Open AI Reflection to create one."
                          : "Check in first to unlock a reflection for this day."}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Month status calendar with selection */}
              <Card className="xl:col-span-4">
                <CardHeader>
                  <CardTitle>Check-in calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  {calendar.loading ? (
                    <LoadingState label="Loading calendar…" className="py-6" />
                  ) : calendar.error ? (
                    <ErrorState
                      message={getAnalyticsErrorMessage(calendar.error)}
                      onRetry={calendar.refetch}
                    />
                  ) : (
                    <StatusCalendar
                      month={calMonth}
                      days={toCalendarMap(calendar.data)}
                      selectedDate={selectedDate}
                      onSelectDate={selectDate}
                      onMonthChange={setCalMonth}
                      maxDate={maxDate}
                    />
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </div>
      <Modal
        open={whyOpen}
        onClose={() => setWhyOpen(false)}
        title="Why this Learning Score?"
        description="An AI explanation grounded in the score components reported for this day."
      >
        {scoreExplanation.envelope ? (
          <AIEnvelopeContent envelope={scoreExplanation.envelope} />
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            {scoreExplanation.phase === "loading"
              ? "Loading the explanation…"
              : "An explanation is not available for this day."}
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
