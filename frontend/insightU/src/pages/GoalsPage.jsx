/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Circle,
  Goal,
  LoaderCircle,
  Pencil,
  Plus,
  Target,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  BehaviorHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  inputClass,
  surface,
} from "@/components/behavior/BehaviorUI";
import {
  CATEGORIES,
  apiMessage,
  asList,
  formatDate,
  titleCase,
  todayLocal,
} from "@/components/behavior/behavior-utils";
import {
  archiveGoal,
  createGoal,
  listGoals,
  updateGoal,
} from "@/services/goals-api";
import { getOverview } from "@/services/analytics-api";
import { listHabits } from "@/services/habits-api";
import { AIInsightCard } from "@/components/ai/AIInsight";
import { useAIInsight } from "@/hooks/useAIInsight";
import { AI_SERVICES } from "@/services/ai-api";

const blankGoal = (timeZone) => ({
  title: "",
  category: "other",
  priority: "medium",
  status: "active",
  start_date: todayLocal(timeZone),
  due_date: "",
  linked_habits: [],
});
const statusStyles = {
  active:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  archived: "bg-slate-100 text-slate-500 dark:bg-white/10",
};

function evidenceRows(goal) {
  const source =
    goal.evidence ||
    goal.alignment_evidence?.evidence ||
    goal.progress_evidence ||
    {};
  const rows = [];
  const add = (label, value) => {
    if (value !== undefined && value !== null)
      rows.push([
        label,
        typeof value === "number" && value <= 1
          ? `${Math.round(value * 100)}%`
          : String(value),
      ]);
  };
  add(
    "Category match",
    source.category_match?.score ??
      source.category_match ??
      goal.category_match,
  );
  add(
    "Study completion",
    source.study_completion?.score ??
      source.study_completion ??
      goal.study_completion,
  );
  add(
    "Linked habit completion",
    source.linked_habit_completion?.score ??
      source.linked_habit_completion ??
      goal.linked_habit_completion,
  );
  add(
    "Goal alignment",
    goal.alignment_evidence?.available
      ? goal.alignment_evidence.score / 100
      : (source.goal_alignment ?? goal.goal_alignment),
  );
  return rows;
}

function GoalForm({ value, onChange, habits, errors }) {
  const toggleHabit = (id) =>
    onChange({
      ...value,
      linked_habits: value.linked_habits.includes(id)
        ? value.linked_habits.filter((item) => item !== id)
        : [...value.linked_habits, id],
    });
  return (
    <div className="space-y-4">
      <Field label="Goal title" error={errors.title}>
        {(props) => (
          <input
            {...props}
            className={inputClass}
            value={value.title}
            onChange={(event) =>
              onChange({ ...value, title: event.target.value })
            }
            placeholder="Complete my data structures project"
            maxLength={180}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          {(props) => (
            <select
              {...props}
              className={inputClass}
              value={value.category}
              onChange={(event) =>
                onChange({ ...value, category: event.target.value })
              }
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Priority">
          {(props) => (
            <select
              {...props}
              className={inputClass}
              value={value.priority}
              onChange={(event) =>
                onChange({ ...value, priority: event.target.value })
              }
            >
              {["low", "medium", "high"].map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date">
          {(props) => (
            <input
              {...props}
              type="date"
              className={inputClass}
              value={value.start_date}
              onChange={(event) =>
                onChange({ ...value, start_date: event.target.value })
              }
            />
          )}
        </Field>
        <Field label="Due date" hint="Optional" error={errors.due_date}>
          {(props) => (
            <input
              {...props}
              type="date"
              className={inputClass}
              value={value.due_date}
              min={value.start_date}
              onChange={(event) =>
                onChange({ ...value, due_date: event.target.value })
              }
            />
          )}
        </Field>
      </div>
      <Field
        label="Linked habits"
        hint={
          habits.length
            ? "Link routines that provide evidence for this goal."
            : "Create an active habit first if you want completion evidence."
        }
      >
        {() =>
          habits.length ? (
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-white/10">
              {habits.map((habit) => (
                <label
                  key={habit.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-indigo-600"
                    checked={value.linked_habits.includes(habit.id)}
                    onChange={() => toggleHabit(habit.id)}
                  />
                  <span className="text-sm font-medium">
                    {habit.icon} {habit.name}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10">
              No active habits available.
            </div>
          )
        }
      </Field>
    </div>
  );
}

export default function GoalsPage({ user }) {
  const userTimezone = user?.timezone || "UTC";
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => blankGoal(userTimezone));
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [goalData, habitData, overview] = await Promise.all([
        listGoals(),
        listHabits(),
        getOverview({ period: "week", anchorDate: todayLocal(userTimezone) }),
      ]);
      const alignments = new Map(
        (overview.goal_alignment || []).map((item) => [
          String(item.goal_id),
          item.alignment,
        ]),
      );
      setGoals(
        asList(goalData).map((goal) => ({
          ...goal,
          alignment_evidence: alignments.get(String(goal.id)) || null,
        })),
      );
      setHabits(asList(habitData).filter((habit) => habit.active !== false));
    } catch (err) {
      setError(apiMessage(err, "Goals could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [userTimezone]);
  useEffect(() => {
    load();
  }, [load]);
  const visible = goals.filter((goal) =>
    filter === "all" ? goal.status !== "archived" : goal.status === filter,
  );
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const coachedGoal =
    [...goals]
      .filter((goal) => goal.status === "active")
      .sort(
        (a, b) =>
          (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3) ||
          String(a.due_date || "9999").localeCompare(
            String(b.due_date || "9999"),
          ),
      )[0] || null;
  const goalCoach = useAIInsight({
    service: AI_SERVICES.GOAL_COACH,
    anchorDate: todayLocal(userTimezone),
    enabled: !loading && Boolean(coachedGoal),
  });
  const openCreate = () => {
    setEditing(null);
    setForm(blankGoal(userTimezone));
    setFormErrors({});
    setFormOpen(true);
  };
  const linkedIds = (goal) =>
    (goal.linked_habits || []).map((item) =>
      typeof item === "object" ? item.id : item,
    );
  const openEdit = (goal) => {
    setEditing(goal);
    setForm({
      title: goal.title || "",
      category: goal.category || "other",
      priority: goal.priority || "medium",
      status: goal.status || "active",
      start_date: goal.start_date || todayLocal(userTimezone),
      due_date: goal.due_date || "",
      linked_habits: linkedIds(goal),
    });
    setFormErrors({});
    setFormOpen(true);
  };
  const save = async () => {
    const errors = {};
    if (!form.title.trim()) errors.title = "Enter a goal title.";
    if (form.due_date && form.start_date && form.due_date < form.start_date)
      errors.due_date = "Due date must be on or after the start date.";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        due_date: form.due_date || null,
      };
      if (editing) await updateGoal(editing.id, payload);
      else await createGoal(payload);
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormErrors({ title: apiMessage(err, "The goal could not be saved.") });
    } finally {
      setSaving(false);
    }
  };
  const toggleComplete = async (goal) => {
    setBusyId(goal.id);
    try {
      await updateGoal(goal.id, {
        status: goal.status === "completed" ? "active" : "completed",
      });
      await load();
    } catch (err) {
      setError(apiMessage(err, "The goal status could not be updated."));
    } finally {
      setBusyId(null);
    }
  };
  const finishArchive = async () => {
    setSaving(true);
    try {
      await archiveGoal(archiving.id);
      setArchiving(null);
      await load();
    } catch (err) {
      setError(apiMessage(err, "The goal could not be archived."));
      setArchiving(null);
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardShell
      user={user}
      header={(props) => (
        <BehaviorHeader
          {...props}
          title="Goals"
          description="Set outcomes and connect them to observable study and habit evidence."
          action={
            <Button
              onClick={openCreate}
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus />
              New goal
            </Button>
          }
        />
      )}
    >
      <div className="space-y-4">
        {coachedGoal && (
          <AIInsightCard
            title={`Goal Coach · ${coachedGoal.title}`}
            description="InsightU automatically selected one active goal using priority and due date."
            insight={goalCoach}
            waitingLabel="Add an active goal to unlock goal coaching."
          />
        )}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter goals"
        >
          {["active", "completed", "all"].map((item) => (
            <Button
              key={item}
              variant={filter === item ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item)}
              className={filter === item ? "bg-indigo-600 text-white" : ""}
            >
              {titleCase(item)}
            </Button>
          ))}
        </div>
        {loading ? (
          <LoadingState label="Loading goals…" />
        ) : error && !goals.length ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            {error && <ErrorState message={error} onRetry={load} />}
            {visible.length ? (
              <section
                className="grid gap-4 lg:grid-cols-2"
                aria-label={`${filter} goals`}
              >
                {visible.map((goal) => {
                  const evidence = evidenceRows(goal);
                  const linked = goal.linked_habits || [];
                  return (
                    <article key={goal.id} className={`${surface} p-5`}>
                      <div className="flex items-start gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300">
                          <Target />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-bold text-slate-950 dark:text-white">
                              {goal.title}
                            </h2>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[goal.status] || statusStyles.active}`}
                            >
                              {goal.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {titleCase(goal.category)} ·{" "}
                            {titleCase(goal.priority)} priority
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(goal)}
                          aria-label={`Edit ${goal.title}`}
                        >
                          <Pencil />
                        </Button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="size-4" />
                          Started {formatDate(goal.start_date)}
                        </span>
                        {goal.due_date && (
                          <span>Due {formatDate(goal.due_date)}</span>
                        )}
                      </div>
                      {linked.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Linked habits
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {linked.map((habit) => (
                              <span
                                key={habit.id || habit}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-white/10"
                              >
                                {typeof habit === "object"
                                  ? habit.name
                                  : habits.find((item) => item.id === habit)
                                      ?.name || `Habit ${habit}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {evidence.length ? (
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                          {evidence.map(([label, value]) => (
                            <div key={label}>
                              <p className="text-[10px] font-bold uppercase text-slate-400">
                                {label}
                              </p>
                              <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/[0.04]">
                          Evidence appears as check-ins and linked habit
                          completions become available.
                        </p>
                      )}
                      <div className="mt-5 flex gap-2">
                        <Button
                          onClick={() => toggleComplete(goal)}
                          disabled={busyId === goal.id}
                          className={`flex-1 rounded-xl ${goal.status === "completed" ? "bg-slate-700 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                        >
                          {busyId === goal.id ? (
                            <LoaderCircle className="animate-spin" />
                          ) : goal.status === "completed" ? (
                            <Circle />
                          ) : (
                            <CheckCircle2 />
                          )}
                          {goal.status === "completed"
                            ? "Reopen"
                            : "Mark complete"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setArchiving(goal)}
                          aria-label={`Archive ${goal.title}`}
                        >
                          <Archive />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : (
              <EmptyState
                icon={Goal}
                title={`No ${filter === "all" ? "current" : filter} goals`}
                description={
                  filter === "active"
                    ? "Create a goal and link habits to build measurable evidence."
                    : "Goals will appear here when their status changes."
                }
                action={
                  filter === "active" && (
                    <Button onClick={openCreate}>
                      <Plus />
                      Create goal
                    </Button>
                  )
                }
              />
            )}
          </>
        )}
      </div>
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit goal" : "Create a goal"}
        description="Link habits so progress is supported by observable activity."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-indigo-600 text-white"
            >
              {saving && <LoaderCircle className="animate-spin" />}
              {editing ? "Save changes" : "Create goal"}
            </Button>
          </>
        }
      >
        <GoalForm
          value={form}
          onChange={setForm}
          habits={habits}
          errors={formErrors}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(archiving)}
        title={`Archive ${archiving?.title || "goal"}?`}
        description="It will be removed from your current goal lists."
        busy={saving}
        onClose={() => setArchiving(null)}
        onConfirm={finishArchive}
      />
    </DashboardShell>
  );
}
