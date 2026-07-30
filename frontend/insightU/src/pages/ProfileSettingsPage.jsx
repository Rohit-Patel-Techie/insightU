import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Goal, Pencil, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
  DashboardCardTitle,
} from "@/components/dashboard/DashboardCard";
import {
  ErrorState,
  LoadingState,
} from "@/components/analytics/AnalyticsStates";
import { useAuth } from "@/context/AuthContext";
import { getProfile } from "@/services/profile-api";
import { listHabits } from "@/services/habits-api";
import { listGoals } from "@/services/goals-api";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    habits: [],
    goals: [],
  });
  useEffect(() => {
    let active = true;
    Promise.all([getProfile(), listHabits({ active: true }), listGoals()])
      .then(([profile, habits, goals]) => {
        if (active)
          setState({
            loading: false,
            error: "",
            profile,
            habits: Array.isArray(habits) ? habits : habits.results || [],
            goals: (Array.isArray(goals) ? goals : goals.results || []).filter(
              (item) => item.status !== "archived",
            ),
          });
      })
      .catch((error) => {
        if (active)
          setState((current) => ({
            ...current,
            loading: false,
            error:
              error?.response?.data?.detail ||
              "Profile data could not be loaded.",
          }));
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <DashboardShell user={user}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold dark:text-white">
              Profile &amp; Baseline
            </h1>
            {/* <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage the assumptions used by your private analytics.
            </p> */}
          </div>
          <Link
            to="/onboarding?edit=1"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white"
          >
            <Pencil className="size-4" />
            Edit profile
          </Link>
        </div>
        {state.loading ? (
          <LoadingState label="Loading profile…" />
        ) : state.error ? (
          <ErrorState message={state.error} />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <DashboardCard>
                <DashboardCardContent className="p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Sparkles />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                    Academic profile
                  </p>
                  <p className="mt-1 text-lg font-extrabold dark:text-white">
                    {state.profile.course || "Not set"} · Year{" "}
                    {state.profile.year || "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {state.profile.timezone}
                  </p>
                </DashboardCardContent>
              </DashboardCard>
              <DashboardCard>
                <DashboardCardContent className="p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Clock3 />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                    Study Baseline
                  </p>
                  <p className="mt-1 text-lg font-extrabold dark:text-white">
                    {state.profile.study_hours} hrs
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {state.profile.study_weekdays?.length || 0} planned weekdays
                    · {state.profile.study_time || "Time not set"}
                  </p>
                </DashboardCardContent>
              </DashboardCard>
              <DashboardCard>
                <DashboardCardContent className="p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                    <Goal />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase text-slate-400">
                    Configured evidence
                  </p>
                  <p className="mt-1 text-lg font-extrabold dark:text-white">
                    {state.habits.length} habits · {state.goals.length} goals
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Editable from their dedicated pages
                  </p>
                </DashboardCardContent>
              </DashboardCard>
            </section>
            <DashboardCard>
              <DashboardCardHeader>
                <DashboardCardTitle>Planned study weekdays</DashboardCardTitle>
                <CalendarDays className="size-4 text-slate-400" />
              </DashboardCardHeader>
              <DashboardCardContent className="flex flex-wrap gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day, index) => (
                    <span
                      key={day}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${state.profile.study_weekdays?.includes(index + 1) ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300" : "bg-slate-100 text-slate-400 dark:bg-white/5"}`}
                    >
                      {day}
                    </span>
                  ),
                )}
              </DashboardCardContent>
            </DashboardCard>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
