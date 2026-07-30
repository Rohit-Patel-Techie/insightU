import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BatteryLow,
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Focus,
  LoaderCircle,
  MoonStar,
  Plus,
  Share2,
  Smartphone,
  TimerReset,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { listGoals } from "@/services/goals-api";
import { listHabits } from "@/services/habits-api";
import { completeOnboarding, getProfile } from "@/services/profile-api";

const WEEKDAYS = [
  { v: 1, s: "M", l: "Monday" },
  { v: 2, s: "T", l: "Tuesday" },
  { v: 3, s: "W", l: "Wednesday" },
  { v: 4, s: "T", l: "Thursday" },
  { v: 5, s: "F", l: "Friday" },
  { v: 6, s: "S", l: "Saturday" },
  { v: 7, s: "S", l: "Sunday" },
];
const CATEGORIES = [
  "programming",
  "academics",
  "exam_prep",
  "project",
  "career",
  "reading",
  "other",
];
const HABITS = [
  { code: "study", name: "Daily Study", icon: "📖", category: "academics" },
  { code: "exercise", name: "Exercise", icon: "🏃", category: "other" },
  { code: "drink_water", name: "Drink Water", icon: "💧", category: "other" },
  {
    code: "sleep_before_11",
    name: "Better Sleep",
    icon: "🛌",
    category: "other",
  },
  {
    code: "less_screen_time",
    name: "Less Screen Time",
    icon: "📵",
    category: "other",
  },
  { code: "meditation", name: "Meditation", icon: "🧘", category: "other" },
  {
    code: "coding_practice",
    name: "Coding Practice",
    icon: "💻",
    category: "programming",
  },
  { code: "read_book", name: "Reading", icon: "📚", category: "reading" },
];
const CHALLENGES = [
  {
    label: "Phone Distraction",
    icon: Smartphone,
    tone: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
  },
  {
    label: "Social Media",
    icon: Share2,
    tone: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
  },
  {
    label: "Procrastination",
    icon: TimerReset,
    tone: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
  },
  {
    label: "Lack of Motivation",
    icon: BatteryLow,
    tone: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
  },
  {
    label: "Poor Focus",
    icon: Focus,
    tone: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
  },
  {
    label: "Stress",
    icon: BrainCircuit,
    tone: "bg-fuchsia-50 text-fuchsia-600 group-hover:bg-fuchsia-100",
  },
  {
    label: "Sleep Issues",
    icon: MoonStar,
    tone: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  },
  {
    label: "Poor Planning",
    icon: CalendarClock,
    tone: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
  },
];
const detectedTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};
const blankGoal = () => ({
  title: "",
  category: "academics",
  priority: "medium",
  due_date: "",
});

function apiMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Unable to reach the server.";
  if (typeof data.detail === "string") return data.detail;
  const value = Object.values(data)[0];
  return Array.isArray(value)
    ? String(value[0])
    : typeof value === "string"
      ? value
      : "Please review the highlighted information.";
}

function SelectableCard({ label, icon, tone, selected, onClick }) {
  const Icon = typeof icon === "string" ? null : icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex min-h-24 flex-col items-center justify-center rounded-xl border p-3 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selected ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600 shadow-sm" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"}`}
    >
      {selected && (
        <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-indigo-600 text-white shadow-sm">
          <Check className="size-3" />
        </span>
      )}
      {Icon ? (
        <span
          className={`grid size-11 place-items-center rounded-2xl transition duration-200 ${selected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : tone || "bg-slate-100 text-slate-600"}`}
        >
          <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
        </span>
      ) : (
        <span className="text-2xl">{icon}</span>
      )}
      <span className="mt-2.5 min-h-8 content-center text-xs font-bold leading-4">
        {label}
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    avatar: "😀",
    course: "",
    year: "",
    study_time: "Morning",
    study_hours: 2,
    study_weekdays: [1, 2, 3, 4, 5],
    challenges: [],
    motivation: "",
    timezone: detectedTimezone(),
    habit_codes: ["study"],
    goals: [blankGoal()],
  });
  const set = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profile, habitsData, goalsData] = await Promise.all([
          getProfile(),
          listHabits(),
          listGoals(),
        ]);
        if (!active) return;
        const habits = Array.isArray(habitsData)
          ? habitsData
          : habitsData.results || [];
        const goals = Array.isArray(goalsData)
          ? goalsData
          : goalsData.results || [];
        setForm((current) => ({
          ...current,
          first_name: profile.first_name || user?.first_name || "",
          avatar: profile.avatar || "😀",
          course: profile.course || "",
          year: profile.year || "",
          study_time: profile.study_time || "Morning",
          study_hours:
            Number(profile.study_hours) > 0 ? Number(profile.study_hours) : 2,
          study_weekdays: profile.study_weekdays?.length
            ? profile.study_weekdays
            : [1, 2, 3, 4, 5],
          challenges: profile.challenges || [],
          motivation: profile.motivation || "",
          timezone: profile.timezone || detectedTimezone(),
          habit_codes: habits.filter((item) => item.active !== false).length
            ? habits
                .filter((item) => item.active !== false)
                .map((item) => item.code)
            : current.habit_codes,
          goals: goals
            .filter((item) => item.status === "active")
            .map((item) => ({
              title: item.title,
              category: item.category,
              priority: item.priority,
              due_date: item.due_date || "",
            }))
            .slice(0, 5).length
            ? goals
                .filter((item) => item.status === "active")
                .map((item) => ({
                  title: item.title,
                  category: item.category,
                  priority: item.priority,
                  due_date: item.due_date || "",
                }))
                .slice(0, 5)
            : [blankGoal()],
        }));
      } catch (err) {
        if (active) setError(apiMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.first_name]);

  const toggle = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  const validation = useMemo(() => {
    if (step === 1 && (!form.first_name.trim() || !form.timezone))
      return "Enter your Name.";
    if (step === 2 && (!form.course || !form.year))
      return "Choose your course and year.";
    if (
      step === 3 &&
      (!form.study_time || form.study_hours <= 0 || !form.study_weekdays.length)
    )
      return "Set study hours, time, and at least one weekday.";
    if (step === 5 && !form.habit_codes.length)
      return "Choose at least one habit.";
    return "";
  }, [step, form]);
  const next = () => {
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    setStep((value) => Math.min(6, value + 1));
  };
  const updateGoal = (index, field, value) =>
    setForm((current) => ({
      ...current,
      goals: current.goals.map((goal, i) =>
        i === index ? { ...goal, [field]: value } : goal,
      ),
    }));
  const removeGoal = (index) =>
    setForm((current) => ({
      ...current,
      goals: current.goals.filter((_, i) => i !== index),
    }));
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const selected = HABITS.filter((item) =>
        form.habit_codes.includes(item.code),
      ).map((item) => ({ ...item, schedule_weekdays: form.study_weekdays }));
      const goals = form.goals
        .filter((goal) => goal.title.trim())
        .map((goal) => ({
          ...goal,
          title: goal.title.trim(),
          due_date: goal.due_date || null,
          linked_habit_codes: selected
            .filter((habit) => habit.category === goal.category)
            .map((habit) => habit.code),
        }));
      await completeOnboarding({ ...form, habits: selected, goals });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <LoaderCircle className="size-7 animate-spin text-indigo-600" />
      </div>
    );
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-500">
              Step {step} of 6
            </span>
            <span className="text-slate-400">
              Authenticated as {user?.email}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <span
                key={item}
                className={`h-2 rounded-full ${item <= step ? "bg-indigo-600" : "bg-slate-200"}`}
              />
            ))}
          </div>
        </div>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {step === 1 && (
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Welcome to InsightU
              </h1>
              <p className="mt-2 text-slate-500">
                Set the Baseline used by your private analytics.
              </p>
              <div className="mt-7 space-y-5">
                <label className="block text-sm font-semibold">
                  What should we call you?
                  <Input
                    className="mt-2"
                    value={form.first_name}
                    onChange={(event) => set("first_name", event.target.value)}
                  />
                </label>
                <div>
                  <p className="text-sm font-semibold">Choose an avatar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["😀", "😎", "👨‍🎓", "👩‍🎓", "📚", "🚀"].map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => set("avatar", item)}
                        className={`grid size-12 place-items-center rounded-full text-2xl ${form.avatar === item ? "bg-indigo-100 ring-2 ring-indigo-500" : "bg-slate-50"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                {/* <label className="block text-sm font-semibold">
                  Your timezone
                  <Input
                    className="mt-2"
                    value={form.timezone}
                    onChange={(event) => set("timezone", event.target.value)}
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    Detected automatically; use an IANA value such as
                    Asia/Kolkata.
                  </span>
                </label> */}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-extrabold">Academic profile</h2>
              <p className="mt-2 text-slate-500">
                Used only to personalize goals and context.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["B.Sc", "B.Com", "BA", "Other"].map((item) => (
                  <SelectableCard
                    key={item}
                    label={item}
                    icon="🎓"
                    selected={form.course === item}
                    onClick={() => set("course", item)}
                  />
                ))}
              </div>
              <p className="mt-7 text-sm font-semibold">Current year</p>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {["1", "2", "3", "4"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => set("year", item)}
                    className={`h-11 rounded-xl border font-bold ${form.year === item ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-extrabold">Study Baseline</h2>
              <p className="mt-2 text-slate-500">
                Expected hours apply only on your planned weekdays.
              </p>

              <div>
                <p className="mt-6 text-sm font-semibold">Mostly Focused</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Morning", "🌅"],
                    ["Afternoon", "☀️"],
                    ["Evening", "🌆"],
                    ["Night", "🌙"],
                  ].map(([item, icon]) => (
                    <SelectableCard
                      key={item}
                      label={item}
                      icon={icon}
                      selected={form.study_time === item}
                      onClick={() => set("study_time", item)}
                    />
                  ))}
                </div>
              </div>
              <label className="mt-7 block text-sm font-semibold">
                Expected hours on a planned day:{" "}
                <b className="text-indigo-600">{form.study_hours}</b>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={form.study_hours}
                  onChange={(event) =>
                    set("study_hours", Number(event.target.value))
                  }
                  className="mt-3 w-full accent-indigo-600"
                />
              </label>
              <p className="mt-6 text-sm font-semibold">
                Planned study weekdays
              </p>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    type="button"
                    title={day.l}
                    key={day.v}
                    onClick={() => toggle("study_weekdays", day.v)}
                    className={`h-11 rounded-xl border font-bold ${form.study_weekdays.includes(day.v) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200"}`}
                  >
                    {day.s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-extrabold">Current challenges</h2>
              {/* <p className="mt-2 text-slate-500">
                Context only—never used for diagnosis.
              </p> */}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CHALLENGES.map((item) => (
                  <SelectableCard
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    tone={item.tone}
                    selected={form.challenges.includes(item.label)}
                    onClick={() => toggle("challenges", item.label)}
                  />
                ))}
              </div>
            </div>
          )}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-extrabold">Habits Want to Build</h2>
              <p className="mt-2 text-slate-500">You can also edit later.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {HABITS.map((item) => (
                  <SelectableCard
                    key={item.code}
                    label={item.name}
                    icon={item.icon}
                    selected={form.habit_codes.includes(item.code)}
                    onClick={() => toggle("habit_codes", item.code)}
                  />
                ))}
              </div>
            </div>
          )}
          {step === 6 && (
            <div>
              <h2 className="text-2xl font-extrabold">Goals and motivation</h2>
              <p className="mt-2 text-slate-500">
                Future Goals You want to achieve. Also Edited after setup.
              </p>
              <div className="mt-6 space-y-3">
                {form.goals.map((goal, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex gap-2">
                      <Input
                        value={goal.title}
                        onChange={(event) =>
                          updateGoal(index, "title", event.target.value)
                        }
                        placeholder="Goal title"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGoal(index)}
                        aria-label="Remove goal"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <select
                        className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                        value={goal.category}
                        onChange={(event) =>
                          updateGoal(index, "category", event.target.value)
                        }
                      >
                        {CATEGORIES.map((item) => (
                          <option key={item} value={item}>
                            {item.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                        value={goal.priority}
                        onChange={(event) =>
                          updateGoal(index, "priority", event.target.value)
                        }
                      >
                        {["low", "medium", "high"].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <div>
                        <label className="text-[14px] mt-2 text-slate-500">
                          Due Date
                        </label>
                        <input
                          type="date"
                          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                          value={goal.due_date}
                          onChange={(event) =>
                            updateGoal(index, "due_date", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => set("goals", [...form.goals, blankGoal()])}
                  disabled={form.goals.length >= 5}
                >
                  <Plus />
                  Add goal
                </Button>
              </div>
              <label className="mt-6 block text-sm font-semibold">
                What motivates you?
                <textarea
                  maxLength={200}
                  rows={3}
                  value={form.motivation}
                  onChange={(event) => set("motivation", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3"
                />
              </label>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="mt-6 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
            >
              <AlertCircle className="size-5" />
              {error}
            </p>
          )}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <Button
              variant="ghost"
              onClick={() => {
                setError("");
                setStep((value) => Math.max(1, value - 1));
              }}
              className={step === 1 ? "invisible" : ""}
              disabled={saving}
            >
              <ChevronLeft />
              Back
            </Button>
            {step < 6 ? (
              <Button onClick={next}>
                Continue
                <ChevronRight />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving}>
                {saving ? <LoaderCircle className="animate-spin" /> : <Check />}
                {saving ? "Saving…" : "Finish setup"}
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
