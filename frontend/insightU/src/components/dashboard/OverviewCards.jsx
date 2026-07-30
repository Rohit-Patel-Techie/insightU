import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Goal,
  ListChecks,
  Smile,
  Target,
} from "lucide-react";
import {
  DashboardCard as Card,
  DashboardCardContent as CardContent,
  DashboardCardHeader as CardHeader,
  DashboardCardTitle as CardTitle,
} from "@/components/dashboard/DashboardCard";
import { cn } from "@/lib/utils";
import {
  Sparkline,
  StudyTrendChart,
  FocusDonut,
} from "@/components/dashboard/ChartPrimitives";

const metricVisuals = {
  focus: {
    icon: Target,
    iconClass:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
  },
  study: {
    icon: Clock3,
    iconClass:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  habits: {
    icon: ListChecks,
    iconClass:
      "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
  },
  goals: {
    icon: Goal,
    iconClass: "bg-sky-100 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400",
  },
};

export function MetricCard({ metric }) {
  const visual = metricVisuals[metric.id] || metricVisuals.focus;
  const Icon = visual.icon;
  return (
    <Card className="dashboard-enter group min-w-0 overflow-hidden transition-transform duration-300 hover:-translate-y-0.5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-xl",
              visual.iconClass,
            )}
          >
            <Icon className="size-5" />
          </span>
          <Sparkline
            values={metric.sparkline}
            color={metric.color}
            className="-mr-2 hidden sm:block"
          />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {metric.label}
        </p>
        <p className="font-display mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[28px]">
          {metric.value}
          <span className="text-sm font-semibold text-slate-400">
            {metric.suffix}
          </span>
        </p>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 sm:text-[11px]">
          <ArrowUpRight className="size-3.5" />
          {metric.trend}{" "}
          <span className="font-medium text-slate-400">from yesterday</span>
        </p>
      </CardContent>
    </Card>
  );
}

export function MoodCard() {
  return (
    <Card className="dashboard-enter col-span-2 overflow-hidden lg:col-span-1">
      <CardContent className="flex h-full min-h-[150px] items-center gap-4 p-4 sm:p-5 lg:block">
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400">
              <Smile className="size-5" />
            </span>
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Mood Today
            </p>
            <p className="font-display mt-1 text-2xl font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
              Good <span className="text-xl">😊</span>
            </p>
          </div>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600 transition hover:bg-violet-200 dark:bg-violet-400/10 dark:text-violet-400"
            aria-label="View mood history"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <Sparkline
          values={[42, 53, 38, 71, 52, 64, 73]}
          color="indigo"
          className="h-16 w-28 lg:mt-2 lg:h-10 lg:w-full"
        />
      </CardContent>
    </Card>
  );
}

export function StudyTrendCard() {
  return (
    <Card className="dashboard-enter dashboard-enter-delay-1 min-w-0 xl:col-span-7">
      <CardHeader>
        <CardTitle>Study Trend</CardTitle>
        <button className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          This Week
          <ChevronDown className="size-3.5" />
        </button>
      </CardHeader>
      <CardContent className="pt-1">
        <StudyTrendChart />
      </CardContent>
    </Card>
  );
}

export function FocusDistributionCard() {
  const items = [
    ["Deep Focus", "42%", "bg-indigo-500"],
    ["Focused", "30%", "bg-emerald-500"],
    ["Distracted", "18%", "bg-orange-400"],
    ["Very Distracted", "10%", "bg-rose-500"],
  ];
  return (
    <Card className="dashboard-enter dashboard-enter-delay-1 min-w-0 xl:col-span-5">
      <CardHeader>
        <CardTitle>Focus Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center xl:flex-col 2xl:flex-row">
        <FocusDonut />
        <div className="grid w-full min-w-0 grid-cols-2 gap-x-5 gap-y-3 sm:w-auto sm:grid-cols-1 xl:w-full xl:grid-cols-2 2xl:w-auto 2xl:grid-cols-1">
          {items.map(([label, value, color]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                <span className={cn("size-2 shrink-0 rounded-full", color)} />
                {label}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function monthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const start = new Date(year, month, 1).getDay();
  return [
    ...Array(start).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
}

export function CalendarCard() {
  const today = new Date();
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(today);
  const cells = monthGrid(today);
  return (
    <Card className="dashboard-enter dashboard-enter-delay-2 hidden min-w-0 xl:block xl:col-span-4">
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <span className="text-[11px] font-semibold text-slate-400">
          {monthName}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <span
              key={`${day}-${index}`}
              className="py-1 text-[9px] font-bold text-slate-400"
            >
              {day}
            </span>
          ))}
          {cells.map((day, index) => (
            <span
              key={index}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300",
                day === today.getDate() &&
                  "bg-indigo-600 text-white shadow-md shadow-indigo-500/20",
                !day && "invisible",
              )}
            >
              {day || ""}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-400/[0.07]">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Today&apos;s check-in is ready
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
