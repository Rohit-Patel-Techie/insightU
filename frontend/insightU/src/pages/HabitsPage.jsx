/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  LoaderCircle,
  Pencil,
  Plus,
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
  WEEKDAYS,
  apiMessage,
  asList,
  formatDate,
  monthLocal,
  titleCase,
  todayLocal,
} from "@/components/behavior/behavior-utils";
import {
  archiveHabit,
  createHabit,
  getHabitCalendar,
  listHabitCompletions,
  listHabits,
  setHabitCompletion,
  updateHabit,
  updateHabitCompletion,
} from "@/services/habits-api";

const blankHabit = {
  name: "",
  category: "other",
  icon: "",
  schedule_weekdays: [1, 2, 3, 4, 5],
};
const monthTitle = (month) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`),
  );
function moveMonth(month, amount) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return monthLocal(date);
}
function dateKey(value) {
  return String(value?.date || value?.completion_date || "").slice(0, 10);
}

function HabitForm({ value, onChange, errors }) {
  const toggleDay = (day) =>
    onChange({
      ...value,
      schedule_weekdays: value.schedule_weekdays.includes(day)
        ? value.schedule_weekdays.filter((item) => item !== day)
        : [...value.schedule_weekdays, day].sort(),
    });
  return (
    <div className="space-y-4">
      <Field label="Habit name" error={errors.name}>
        {(props) => (
          <input
            {...props}
            className={inputClass}
            value={value.name}
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
            placeholder="Review lecture notes"
            maxLength={120}
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
        <Field label="Icon" hint="Optional short emoji or symbol.">
          {(props) => (
            <input
              {...props}
              className={inputClass}
              value={value.icon || ""}
              onChange={(event) =>
                onChange({ ...value, icon: event.target.value })
              }
              maxLength={8}
              placeholder="✓"
            />
          )}
        </Field>
      </div>
      <Field label="Weekly schedule" error={errors.schedule_weekdays}>
        {() => (
          <div
            className="grid grid-cols-7 gap-2"
            role="group"
            aria-label="Habit schedule weekdays"
          >
            {WEEKDAYS.map((day) => {
              const selected = value.schedule_weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={selected}
                  title={day.label}
                  onClick={() => toggleDay(day.value)}
                  className={`grid h-10 place-items-center rounded-xl border text-sm font-bold transition ${selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-500 hover:border-indigo-300 dark:border-white/10 dark:text-slate-300"}`}
                >
                  {day.short}
                  <span className="sr-only">{day.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </Field>
    </div>
  );
}

function Calendar({ month, calendar, completions, onMonthChange }) {
  const first = new Date(`${month}-01T12:00:00`);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const calendarRows = Array.isArray(calendar)
    ? calendar
    : calendar?.days || calendar?.results || [];
  const completionMap = (() => {
    const map = new Map();
    calendarRows.forEach((day) => {
      if (!day?.date) return;
      const habits = Array.isArray(day.habits) ? day.habits : [];
      map.set(day.date, {
        complete: habits.filter((item) => item.completed).length,
        due: habits.filter((item) => item.scheduled).length,
      });
    });
    completions.forEach((item) => {
      const key = dateKey(item);
      if (!key || map.has(key)) return;
      map.set(key, { complete: item.completed ? 1 : 0, due: 1 });
    });
    return map;
  })();
  return (
    <section className={`${surface} p-4 sm:p-5`} aria-label="Habit calendar">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">
            Monthly calendar
          </h2>
          <p className="text-xs text-slate-500">Recorded completions only</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(moveMonth(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold">
            {monthTitle(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(moveMonth(month, 1))}
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day.label}
            className="py-1 text-[10px] font-bold uppercase text-slate-400"
          >
            {day.short}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const key = `${month}-${String(day).padStart(2, "0")}`;
          const status = completionMap.get(key);
          return (
            <div
              key={key}
              className={`min-h-12 rounded-lg border p-1 text-left text-xs ${status?.complete ? "border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10" : "border-slate-100 dark:border-white/[0.06]"}`}
            >
              <span className="font-semibold">{day}</span>
              {status?.complete > 0 && (
                <span className="mt-1 block text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                  {status.complete}
                  {status.due ? `/${status.due}` : ""} done
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function HabitsPage({ user }) {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [month, setMonth] = useState(() =>
    monthLocal(new Date(), user?.timezone),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankHabit);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [historyHabit, setHistoryHabit] = useState(null);
  const [busyHabit, setBusyHabit] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [habitData, completionData, calendarData] = await Promise.all([
        listHabits(),
        listHabitCompletions({ month }),
        getHabitCalendar(month),
      ]);
      setHabits(asList(habitData).filter((item) => item.active !== false));
      setCompletions(asList(completionData));
      setCalendar(calendarData);
    } catch (err) {
      setError(apiMessage(err, "Habits could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);
  const openCreate = () => {
    setEditing(null);
    setForm(blankHabit);
    setFormErrors({});
    setFormOpen(true);
  };
  const openEdit = (habit) => {
    setEditing(habit);
    setForm({
      name: habit.name || "",
      category: habit.category || "other",
      icon: habit.icon || "",
      schedule_weekdays: Array.isArray(habit.schedule_weekdays)
        ? habit.schedule_weekdays
        : [],
    });
    setFormErrors({});
    setFormOpen(true);
  };
  const save = async () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Enter a habit name.";
    if (!form.schedule_weekdays.length)
      errors.schedule_weekdays = "Choose at least one scheduled day.";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editing) await updateHabit(editing.id, payload);
      else await createHabit(payload);
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormErrors({ name: apiMessage(err, "The habit could not be saved.") });
    } finally {
      setSaving(false);
    }
  };
  const toggleToday = async (habit) => {
    const today = todayLocal(user?.timezone);
    const existing = completions.find(
      (item) =>
        String(item.habit?.id ?? item.habit) === String(habit.id) &&
        dateKey(item) === today,
    );
    setBusyHabit(habit.id);
    try {
      if (existing)
        await updateHabitCompletion(existing.id, {
          completed: !existing.completed,
        });
      else
        await setHabitCompletion({
          habit: habit.id,
          date: today,
          completed: true,
          source: "manual",
        });
      await load();
    } catch (err) {
      setError(apiMessage(err, "The completion could not be updated."));
    } finally {
      setBusyHabit(null);
    }
  };
  const finishArchive = async () => {
    setSaving(true);
    try {
      await archiveHabit(archiving.id);
      setArchiving(null);
      await load();
    } catch (err) {
      setError(apiMessage(err, "The habit could not be archived."));
      setArchiving(null);
    } finally {
      setSaving(false);
    }
  };
  const today = todayLocal(user?.timezone);
  const isComplete = (habit) =>
    completions.some(
      (item) =>
        String(item.habit?.id ?? item.habit) === String(habit.id) &&
        dateKey(item) === today &&
        item.completed,
    );
  const history = historyHabit
    ? completions
        .filter(
          (item) =>
            String(item.habit?.id ?? item.habit) === String(historyHabit.id),
        )
        .sort((a, b) => dateKey(b).localeCompare(dateKey(a)))
    : [];
  return (
    <DashboardShell
      user={user}
      header={(props) => (
        <BehaviorHeader
          {...props}
          title="Habits"
          description="Build routines on a schedule and track real completion history."
          action={
            <Button
              onClick={openCreate}
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus />
              New habit
            </Button>
          }
        />
      )}
    >
      <div className="space-y-4">
        {loading ? (
          <LoadingState label="Loading habits…" />
        ) : error && !habits.length ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            {error && <ErrorState message={error} onRetry={load} />}
            {habits.length ? (
              <section
                className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                aria-label="Active habits"
              >
                {habits.map((habit) => (
                  <article key={habit.id} className={`${surface} p-5`}>
                    <div className="flex items-start gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-lg dark:bg-indigo-400/10">
                        {habit.icon || (
                          <Check className="size-5 text-indigo-600" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-bold text-slate-950 dark:text-white">
                          {habit.name}
                        </h2>
                        <p className="text-xs font-semibold text-slate-400">
                          {titleCase(habit.category)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(habit)}
                        aria-label={`Edit ${habit.name}`}
                      >
                        <Pencil />
                      </Button>
                    </div>
                    <div
                      className="mt-4 flex gap-1.5"
                      aria-label="Scheduled days"
                    >
                      {WEEKDAYS.map((day) => (
                        <span
                          key={day.value}
                          title={day.label}
                          className={`grid size-7 place-items-center rounded-full text-[10px] font-bold ${habit.schedule_weekdays?.includes(day.value) ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300" : "bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-slate-600"}`}
                        >
                          {day.short}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        onClick={() => toggleToday(habit)}
                        disabled={busyHabit === habit.id}
                        className={`flex-1 rounded-xl ${isComplete(habit) ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                      >
                        {busyHabit === habit.id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Check />
                        )}
                        {isComplete(habit)
                          ? "Completed today"
                          : "Mark complete"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setHistoryHabit(habit)}
                        aria-label={`View ${habit.name} history`}
                      >
                        <History />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setArchiving(habit)}
                        aria-label={`Archive ${habit.name}`}
                      >
                        <Archive />
                      </Button>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No active habits"
                description="Create a scheduled habit to start recording your consistency."
                action={
                  <Button onClick={openCreate}>
                    <Plus />
                    Create habit
                  </Button>
                }
              />
            )}
            <Calendar
              month={month}
              calendar={calendar}
              completions={completions}
              onMonthChange={setMonth}
            />
          </>
        )}
      </div>
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit habit" : "Create a habit"}
        description="Choose the days when this habit is due."
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
              {editing ? "Save changes" : "Create habit"}
            </Button>
          </>
        }
      >
        <HabitForm value={form} onChange={setForm} errors={formErrors} />
      </Modal>
      <Modal
        open={Boolean(historyHabit)}
        onClose={() => setHistoryHabit(null)}
        title={`${historyHabit?.name || "Habit"} history`}
        description={monthTitle(month)}
      >
        {history.length ? (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {history.map((item) => (
              <li
                key={item.id || `${dateKey(item)}-${item.habit}`}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {formatDate(dateKey(item))}
                  </p>
                  <p className="text-xs text-slate-400">
                    {titleCase(item.source || "recorded")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.completed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-white/10"}`}
                >
                  {item.completed ? "Completed" : "Not completed"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            No recorded history for this month.
          </p>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(archiving)}
        title={`Archive ${archiving?.name || "habit"}?`}
        description="It will leave your active habit list."
        busy={saving}
        onClose={() => setArchiving(null)}
        onConfirm={finishArchive}
      />
    </DashboardShell>
  );
}
