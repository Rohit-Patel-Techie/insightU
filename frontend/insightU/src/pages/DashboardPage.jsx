import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { StreakCard } from "@/components/dashboard/Navigation"
import { CalendarCard, FocusDistributionCard, MetricCard, MoodCard, StudyTrendCard } from "@/components/dashboard/OverviewCards"
import { AIReflectionCard, DistractionsCard, HabitOverviewCard, MoodTrackerCard, QuickActionsCard, TodayPlanCard } from "@/components/dashboard/DetailCards"
import { metrics } from "@/data/dashboard-data"

export default function DashboardPage({ user }) {
  return (
    <DashboardShell user={user}>
      {(dashboardUser) => (
        <div className="space-y-4 sm:space-y-5">
          <div className="lg:hidden"><StreakCard /></div>

          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5" aria-label="Daily overview">
            {metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
            <MoodCard />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12" aria-label="Study and focus insights">
            <StudyTrendCard />
            <FocusDistributionCard />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12" aria-label="Behavior overview">
            <CalendarCard />
            <HabitOverviewCard />
            <DistractionsCard />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12" aria-label="Mood and daily plan">
            <MoodTrackerCard />
            <TodayPlanCard />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12" aria-label="Reflection and quick actions">
            <AIReflectionCard user={dashboardUser} />
            <QuickActionsCard />
          </section>

          <p className="pb-2 pt-3 text-center text-[11px] text-slate-400">Dashboard preview data · Connect each section to your API when ready</p>
        </div>
      )}
    </DashboardShell>
  )
}
