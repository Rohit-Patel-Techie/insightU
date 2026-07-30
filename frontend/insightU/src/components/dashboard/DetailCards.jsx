import { useMemo, useState } from "react";
import {
  Bot,
  BookOpenText,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Goal,
  Plus,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DashboardCard as Card,
  DashboardCardContent as CardContent,
  DashboardCardHeader as CardHeader,
  DashboardCardTitle as CardTitle,
} from "@/components/dashboard/DashboardCard";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { MoodLine } from "@/components/dashboard/ChartPrimitives";
import { cn } from "@/lib/utils";
import {
  distractions,
  habits,
  quickActions,
  tasks as initialTasks,
} from "@/data/dashboard-data";

export function HabitOverviewCard() {
  return (
    <Card className="dashboard-enter dashboard-enter-delay-2 min-w-0 xl:col-span-4">
      <CardHeader>
        <CardTitle>Habit Overview</CardTitle>
        <Link
          to="/habits"
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {habits.map((habit) => (
          <div key={habit.label}>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {habit.label}
              </span>
              <span className="font-bold text-slate-400">{habit.value}%</span>
            </div>
            <ProgressBar value={habit.value} indicatorClassName={habit.color} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DistractionsCard() {
  return (
    <Card className="dashboard-enter dashboard-enter-delay-2 min-w-0 xl:col-span-4">
      <CardHeader>
        <CardTitle>Top Distractions</CardTitle>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          This Week
          <ChevronDown className="size-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {distractions.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[76px_1fr_48px] items-center gap-3 text-[11px]"
          >
            <span className="truncate font-semibold text-slate-600 dark:text-slate-300">
              {item.label}
            </span>
            <ProgressBar
              value={item.value}
              className="h-2.5"
              indicatorClassName={item.color}
            />
            <span className="text-right font-bold text-slate-400">
              {item.time}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MoodTrackerCard() {
  return (
    <Card className="dashboard-enter dashboard-enter-delay-2 min-w-0 xl:col-span-4">
      <CardHeader>
        <CardTitle>Mood Tracker</CardTitle>
        <Link
          to="/check-in"
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
        >
          Check in
        </Link>
      </CardHeader>
      <CardContent className="pt-4">
        <MoodLine />
      </CardContent>
    </Card>
  );
}

export function TodayPlanCard() {
  const [tasks, setTasks] = useState(initialTasks);
  const completed = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks],
  );
  const toggleTask = (id) =>
    setTasks((items) =>
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );

  return (
    <Card className="dashboard-enter dashboard-enter-delay-3 min-w-0 xl:col-span-8">
      <CardHeader>
        <CardTitle>Today&apos;s Plan</CardTitle>
        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
          {completed}/{tasks.length} Completed
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-md border",
                task.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 dark:border-white/20",
              )}
            >
              {task.done && <Check className="size-3.5" />}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs font-semibold",
                task.done
                  ? "text-slate-400 line-through"
                  : "text-slate-700 dark:text-slate-200",
              )}
            >
              {task.title}
            </span>
            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
              {task.time}
            </span>
          </button>
        ))}
        <Button
          variant="ghost"
          className="mt-2 w-full border border-dashed border-slate-200 text-indigo-600 dark:border-white/10 dark:text-indigo-400"
        >
          <Plus className="size-4" />
          Add New Task
        </Button>
      </CardContent>
    </Card>
  );
}

export function AIReflectionCard({ user }) {
  return (
    <Card className="dashboard-enter dashboard-enter-delay-3 relative min-w-0 overflow-hidden xl:col-span-7">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <CardContent className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="relative grid size-20 shrink-0 place-items-center rounded-[24px] bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 text-white shadow-xl shadow-indigo-500/20">
          <Bot className="size-10" />
          <span className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-white text-indigo-600 shadow">
            <Sparkles className="size-3.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">AI Reflection</CardTitle>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Preview
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Great job, {user.firstName}! Your consistency is improving and your
            focus score is higher than last week. You&apos;re most productive in
            the morning. Try to minimize social media during study blocks.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              Consistency +
            </Badge>
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              Morning Person
            </Badge>
            <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300">
              Focus Improving
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-4 top-4 rounded-full sm:static"
          aria-label="Open AI reflection"
        >
          <ChevronRight className="size-5" />
        </Button>
      </CardContent>
    </Card>
  );
}

const actionVisuals = {
  indigo: {
    icon: ClipboardCheck,
    className:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
  },
  emerald: {
    icon: CalendarCheck2,
    className:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  orange: {
    icon: BookOpenText,
    className:
      "bg-orange-100 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400",
  },
  sky: {
    icon: Goal,
    className: "bg-sky-100 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
  },
};

export function QuickActionsCard() {
  return (
    <Card className="dashboard-enter dashboard-enter-delay-3 min-w-0 xl:col-span-5">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const visual = actionVisuals[action.color] || actionVisuals.indigo;
          const Icon = visual.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="group flex min-h-24 flex-col items-start justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 dark:border-white/[0.06] dark:bg-white/[0.035] dark:hover:border-indigo-400/20 dark:hover:bg-white/[0.06] dark:hover:shadow-none"
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  visual.className,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex w-full items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                {action.label}
                <ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
