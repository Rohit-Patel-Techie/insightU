import { Check, CircleX, ListChecks, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { UnavailableNote } from "@/components/analytics/AnalyticsStates"
import { cn } from "@/lib/utils"

const DISTRACTION_COLORS = [
  { bar: "from-rose-500 to-orange-400", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-300" },
  { bar: "from-amber-400 to-yellow-300", dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-300" },
  { bar: "from-sky-500 to-cyan-400", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-300" },
  { bar: "from-violet-500 to-fuchsia-400", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-300" },
  { bar: "from-emerald-500 to-teal-400", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-300" },
]

function CompletionRing({ completed, scheduled }) {
  const available = scheduled > 0
  const rate = available ? Math.round((completed / scheduled) * 100) : 0
  return (
    <div className="relative grid size-32 shrink-0 place-items-center sm:size-36" role="img" aria-label={available ? `${completed} of ${scheduled} habits completed, ${rate}%` : "No habits scheduled"}>
      <div className="absolute inset-0 rounded-full bg-slate-200/80 shadow-inner dark:bg-white/10" />
      <div className="absolute inset-0 rounded-full transition-[background] duration-700" style={{ background: `conic-gradient(#10b981 0 ${rate}%, transparent ${rate}% 100%)` }} />
      <div className="absolute inset-[12px] rounded-full border border-white/80 bg-white shadow-[0_12px_35px_rgba(16,185,129,0.16)] dark:border-white/10 dark:bg-[#151a2e]" />
      <div className="relative text-center">
        <p className="font-metric text-2xl font-medium tracking-[-0.08em] text-slate-950 dark:text-white">{available ? `${rate}%` : "—"}</p>
        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">complete</p>
      </div>
    </div>
  )
}

function HabitsPanel({ habits }) {
  const items = habits?.items || []
  const scheduled = Number(habits?.scheduled ?? items.length)
  const completed = Number(habits?.completed ?? items.filter((item) => item.completed).length)
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-emerald-100/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 dark:border-emerald-400/10 dark:from-emerald-400/[0.08] dark:via-white/[0.025] dark:to-teal-400/[0.05] sm:p-5" aria-labelledby="dashboard-habits-title">
      <div className="pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p id="dashboard-habits-title" className="font-display text-sm font-extrabold text-slate-900 dark:text-white">Habit rhythm</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Today&apos;s scheduled routines</p>
        </div>
        <span className="grid size-10 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><ListChecks className="size-5" /></span>
      </div>
      {items.length ? (
        <div className="relative mt-5 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
          <CompletionRing completed={completed} scheduled={scheduled} />
          <ul className="space-y-2.5" aria-label="Habit completion states">
            {items.map((habit) => (
              <li key={habit.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/75 px-3 py-2 shadow-sm backdrop-blur dark:border-white/[0.06] dark:bg-white/[0.04]">
                <span className="min-w-0 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{habit.name}</span>
                <span className={cn("flex shrink-0 items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide", habit.completed ? "text-emerald-600 dark:text-emerald-300" : "text-slate-400")}>
                  {habit.completed ? <Check className="size-3.5" /> : <CircleX className="size-3.5" />}{habit.completed ? "Done" : "Missed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : <UnavailableNote className="mt-5">No habits were scheduled.</UnavailableNote>}
    </section>
  )
}

function DistractionsPanel({ distractions }) {
  const maxCount = Math.max(1, ...distractions.map((item) => Number(item.count) || 0))
  const total = distractions.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-rose-100/80 bg-gradient-to-br from-rose-50 via-white to-amber-50/70 p-4 dark:border-rose-400/10 dark:from-rose-400/[0.08] dark:via-white/[0.025] dark:to-amber-400/[0.05] sm:p-5" aria-labelledby="dashboard-distractions-title">
      <div className="pointer-events-none absolute -bottom-16 -right-12 size-40 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p id="dashboard-distractions-title" className="font-display text-sm font-extrabold text-slate-900 dark:text-white">Distraction signals</p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Frequency reported, never duration</p>
        </div>
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/20"><Zap className="size-5" /></span>
      </div>
      {distractions.length ? (
        <div className="relative mt-5">
          <div className="mb-4 flex items-end justify-between rounded-2xl border border-white/80 bg-white/70 px-4 py-3 backdrop-blur dark:border-white/[0.06] dark:bg-white/[0.04]">
            <div><p className="font-metric text-2xl font-medium tracking-[-0.06em] text-slate-950 dark:text-white">{total}</p><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">total reports</p></div>
            <Sparkles className="size-5 text-amber-400" aria-hidden="true" />
          </div>
          <div className="space-y-3.5" role="img" aria-label={`Distraction frequency graph with ${total} total reports`}>
            {distractions.map((item, index) => {
              const count = Number(item.count) || 0
              const width = count > 0 ? Math.max(12, (count / maxCount) * 100) : 0
              const color = DISTRACTION_COLORS[index % DISTRACTION_COLORS.length]
              return (
                <div key={item.label} aria-label={`${item.label}: ${count} times reported`}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><span className={cn("size-2 shrink-0 rounded-full", color.dot)} /> <span className="truncate">{item.label}</span></span>
                    <span className={cn("font-metric shrink-0 text-xs font-medium", color.text)}>{count}×</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white shadow-inner dark:bg-white/[0.07]">
                    <div className={cn("h-full rounded-full bg-gradient-to-r shadow-sm transition-[width] duration-700", color.bar)} style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="relative mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-center dark:border-emerald-400/20 dark:bg-emerald-400/[0.05]">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><ShieldCheck className="size-5" /></span>
          <p className="font-display mt-3 text-sm font-extrabold text-slate-800 dark:text-white">Clear focus window</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">No distractions were reported.</p>
        </div>
      )}
    </section>
  )
}

export function HabitsDistractionsVisual({ habits, distractions = [] }) {
  return <div className="grid gap-4 lg:grid-cols-2"><HabitsPanel habits={habits} /><DistractionsPanel distractions={distractions} /></div>
}
