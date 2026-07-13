import { LockKeyhole, Save, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CheckInCard, FieldError, FocusScale, HabitGrid, OptionGrid, Question } from "@/components/check-in/CheckInPrimitives"
import {
  dayTypeOptions, distractionOptions, distractionTimeOptions, focusOptions, habitOptions,
  moodOptions, optionLabel, studyCompletionOptions,
} from "@/data/check-in-data"
import { cn } from "@/lib/utils"

export function StudyProgressSection({ form, errors, setField, className }) {
  const hoursLabel = form.studyHours === 8 ? "8+" : Number(form.studyHours).toFixed(1)
  return (
    <CheckInCard step={1} title="Study Progress" helper="Let's see how your study day went." emoji="📚" className={className}>
      <Question label="How many hours did you study today?">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.035]">
          <div className="flex items-end justify-between gap-3"><span className="font-display text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{hoursLabel}</span><span className="pb-1 text-xs font-bold text-slate-400">Hours</span></div>
          <input className="checkin-range mt-4 w-full" type="range" min="0" max="8" step="0.5" value={form.studyHours} onChange={(event) => setField("studyHours", Number(event.target.value))} aria-label="Study hours" />
          <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400"><span>0</span><span>2</span><span>4</span><span>6</span><span>8+</span></div>
        </div>
      </Question>
      <Question label="Did you complete your planned study today?">
        <OptionGrid options={studyCompletionOptions} value={form.studyCompletion} onChange={(value) => setField("studyCompletion", value)} columns={3} ariaLabel="Planned study completion" />
        <FieldError message={errors.studyCompletion} />
      </Question>
      <Question label="How focused were you today?">
        <FocusScale options={focusOptions} value={form.focusLevel} onChange={(value) => setField("focusLevel", value)} />
        <FieldError message={errors.focusLevel} />
      </Question>
    </CheckInCard>
  )
}

export function MoodEnergySection({ form, errors, setField, className }) {
  return (
    <CheckInCard step={2} title="Mood & Energy" helper="Your mood matters. Be honest with yourself." emoji="😊" className={className}>
      <Question label="How are you feeling today?">
        <OptionGrid options={moodOptions} value={form.mood} onChange={(value) => setField("mood", value)} columns={3} ariaLabel="Mood" />
        <FieldError message={errors.mood} />
      </Question>
      <Question label="What best describes your day?">
        <OptionGrid options={dayTypeOptions} value={form.dayType} onChange={(value) => setField("dayType", value)} columns={3} ariaLabel="Day type" />
        <FieldError message={errors.dayType} />
      </Question>
    </CheckInCard>
  )
}

export function DistractionsSection({ form, errors, setField, toggleListValue, className }) {
  const selectedNothing = form.distractions.includes("nothing")
  return (
    <CheckInCard step={3} title="Distractions" helper="Identify what pulled your attention away." emoji="📱" className={className}>
      <Question label="What distracted you the most today?" hint="Select all that apply. Choosing Nothing clears the others.">
        <OptionGrid options={distractionOptions} value={form.distractions} onChange={(value) => toggleListValue("distractions", value)} columns={3} multiple ariaLabel="Distractions" />
        <FieldError message={errors.distractions} />
      </Question>
      <Question label="When were you most distracted?" hint={selectedNothing ? "Not needed when Nothing is selected." : undefined}>
        <div className={cn(selectedNothing && "pointer-events-none opacity-45")}>
          <OptionGrid options={distractionTimeOptions} value={form.distractionTime} onChange={(value) => setField("distractionTime", value)} columns={4} ariaLabel="Distraction time" />
        </div>
        <FieldError message={errors.distractionTime} />
      </Question>
    </CheckInCard>
  )
}

export function HabitsSection({ form, toggleListValue, className }) {
  return (
    <CheckInCard step={4} title="Habits" helper="Select the habits you followed today." emoji="🌱" className={className}>
      <HabitGrid options={habitOptions} selectedValues={form.habits} onToggle={(value) => toggleListValue("habits", value)} />
      <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-400/10 dark:bg-emerald-400/[0.07]">
        <span className="text-xl">🌿</span><p className="text-xs font-semibold leading-5 text-emerald-800 dark:text-emerald-300">Keep going! Small, consistent steps create meaningful change.</p>
      </div>
    </CheckInCard>
  )
}

function ReflectionField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={150}
        rows={4}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/[0.035] dark:text-white dark:focus:border-indigo-400 dark:focus:bg-white/[0.05]"
      />
      <span className="mt-1 block text-right text-[10px] font-semibold text-slate-400">{value.length}/150</span>
    </label>
  )
}

export function ReflectionSection({ form, setField, className }) {
  return (
    <CheckInCard step={5} title="Reflection" helper="A quick reflection helps you improve." emoji="✨" className={className}>
      <ReflectionField label="What went well today?" value={form.wentWell} onChange={(value) => setField("wentWell", value)} placeholder="For example: I completed my assignment and stayed focused..." />
      <ReflectionField label="What will you improve tomorrow?" value={form.improveTomorrow} onChange={(value) => setField("improveTomorrow", value)} placeholder="For example: I will avoid social media during study time..." />
    </CheckInCard>
  )
}

export function SummarySection({ form, user, submitted, className }) {
  const summary = [
    ["Study Hours", `${form.studyHours === 8 ? "8+" : Number(form.studyHours).toFixed(1)} hrs`, "⏱️"],
    ["Focus Level", optionLabel(focusOptions, form.focusLevel), "🎯"],
    ["Mood", optionLabel(moodOptions, form.mood), "😊"],
    ["Habits Completed", `${form.habits.length} / ${habitOptions.length}`, "🌱"],
    ["Top Distraction", form.distractions.map((value) => optionLabel(distractionOptions, value)).slice(0, 2).join(", ") || "Not selected", "📱"],
    ["Distraction Time", form.distractions.includes("nothing") ? "Not applicable" : optionLabel(distractionTimeOptions, form.distractionTime), "🕐"],
  ]
  return (
    <CheckInCard step={6} title="Summary" helper="Review today's check-in before submitting." emoji="🎉" className={className}>
      {submitted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-full bg-emerald-500 text-white"><ShieldCheck className="size-5" /></span><div><p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">Frontend check complete, {user.firstName}!</p><p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">Validation passed. No information was sent because backend submission is not connected yet.</p></div></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {summary.map(([label, value, emoji]) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.035]">
            <span className="text-lg" aria-hidden="true">{emoji}</span>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 break-words text-xs font-extrabold leading-4 text-slate-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
        <div className="flex items-center gap-2"><Sparkles className="size-4" /><p className="text-sm font-extrabold">Great work, {user.firstName}!</p></div>
        <p className="mt-1.5 text-xs leading-5 text-indigo-100">You're taking another step toward understanding yourself and building better routines.</p>
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-400"><LockKeyhole className="size-3.5" />Your future check-in data will remain private and secure.</div>
    </CheckInCard>
  )
}

export function DraftNotice({ notice }) {
  if (!notice) return null
  const isError = notice.type === "error"
  return <Badge role="status" className={cn("gap-1.5", isError ? "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300")}><Save className="size-3" />{notice.message}</Badge>
}
