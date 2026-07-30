import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BrainCircuit, Clock3, Flame, Goal, ListChecks, Smile, Target } from "lucide-react"
import { DashboardCard as Card, DashboardCardContent as CardContent } from "@/components/dashboard/DashboardCard"
import { cn } from "@/lib/utils"

const VISUALS = {
  learning: {
    icon: BrainCircuit, delay: 0, accent: "bg-indigo-500", text: "text-indigo-700 dark:text-indigo-300",
    iconClass: "bg-indigo-600 text-white shadow-indigo-500/25",
    cardClass: "border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/90 to-violet-100/75 dark:border-indigo-400/20 dark:from-[#171a2b] dark:via-indigo-500/10 dark:to-violet-500/15",
    glowClass: "bg-indigo-400/25",
  },
  study: {
    icon: Clock3, delay: 0.04, accent: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300",
    iconClass: "bg-emerald-500 text-white shadow-emerald-500/25",
    cardClass: "border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/90 to-teal-100/70 dark:border-emerald-400/20 dark:from-[#151b28] dark:via-emerald-500/10 dark:to-teal-500/15",
    glowClass: "bg-emerald-400/25",
  },
  habits: {
    icon: ListChecks, delay: 0.08, accent: "bg-amber-500", text: "text-amber-700 dark:text-amber-300",
    iconClass: "bg-amber-500 text-white shadow-amber-500/25",
    cardClass: "border-amber-200/80 bg-gradient-to-br from-white via-amber-50/90 to-orange-100/70 dark:border-amber-400/20 dark:from-[#1c1924] dark:via-amber-500/10 dark:to-orange-500/15",
    glowClass: "bg-amber-400/25",
  },
  goals: {
    icon: Goal, delay: 0.12, accent: "bg-sky-500", text: "text-sky-700 dark:text-sky-300",
    iconClass: "bg-sky-500 text-white shadow-sky-500/25",
    cardClass: "border-sky-200/80 bg-gradient-to-br from-white via-sky-50/90 to-cyan-100/75 dark:border-sky-400/20 dark:from-[#151a29] dark:via-sky-500/10 dark:to-cyan-500/15",
    glowClass: "bg-sky-400/25",
  },
  mood: {
    icon: Smile, delay: 0.16, accent: "bg-fuchsia-500", text: "text-fuchsia-700 dark:text-fuchsia-300",
    iconClass: "bg-fuchsia-500 text-white shadow-fuchsia-500/25",
    cardClass: "border-fuchsia-200/80 bg-gradient-to-br from-white via-fuchsia-50/85 to-pink-100/70 dark:border-fuchsia-400/20 dark:from-[#1b1729] dark:via-fuchsia-500/10 dark:to-pink-500/15",
    glowClass: "bg-fuchsia-400/25",
  },
  streak: {
    icon: Flame, delay: 0.2, accent: "bg-rose-500", text: "text-rose-700 dark:text-rose-300",
    iconClass: "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-orange-500/30",
    cardClass: "border-orange-200/80 bg-gradient-to-br from-white via-orange-50/90 to-rose-100/70 dark:border-orange-400/20 dark:from-[#1d1823] dark:via-orange-500/10 dark:to-rose-500/15",
    glowClass: "bg-orange-400/30",
  },
  focus: {
    icon: Target, delay: 0, accent: "bg-violet-500", text: "text-violet-700 dark:text-violet-300",
    iconClass: "bg-violet-500 text-white shadow-violet-500/25",
    cardClass: "border-violet-200/80 bg-gradient-to-br from-white via-violet-50/90 to-indigo-100/70 dark:border-violet-400/20 dark:from-[#171a2b] dark:via-violet-500/10 dark:to-indigo-500/15",
    glowClass: "bg-violet-400/25",
  },
}

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if (!query) return undefined
    const update = () => setReduced(query.matches)
    query.addEventListener?.("change", update)
    return () => query.removeEventListener?.("change", update)
  }, [])
  return reduced
}

function useCountUp(value, reducedMotion, duration = 800) {
  const target = Number(value)
  const [current, setCurrent] = useState(reducedMotion || !Number.isFinite(target) ? target : 0)
  useEffect(() => {
    if (!Number.isFinite(target) || reducedMotion || target === 0) {
      const frame = requestAnimationFrame(() => setCurrent(target))
      return () => cancelAnimationFrame(frame)
    }
    let frame
    const started = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - started) / duration, 1)
      setCurrent(target * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, reducedMotion, target])
  return current
}

function decimalPlaces(value) {
  const text = String(value)
  return text.includes(".") ? Math.min(text.split(".")[1].length, 2) : 0
}

function AnimatedNumber({ value, suffix, reducedMotion }) {
  const decimals = decimalPlaces(value)
  const current = useCountUp(value, reducedMotion)
  return <>{Number(current).toFixed(decimals)}<span className="ml-0.5 text-sm font-bold text-slate-500/90 dark:text-slate-300/80">{suffix}</span></>
}

function HabitMetric({ value, reducedMotion, visual }) {
  const match = String(value).match(/^(\d+)\s*\/\s*(\d+)$/)
  const completed = match ? Number(match[1]) : 0
  const scheduled = match ? Number(match[2]) : 0
  const currentCompleted = Math.round(useCountUp(completed, reducedMotion))
  const currentScheduled = Math.round(useCountUp(scheduled, reducedMotion))
  if (!match) return <span>{value}</span>
  const segments = Math.min(scheduled, 8)
  return <>
    <span>{currentCompleted}<span className="text-lg text-slate-500 dark:text-slate-300">/{currentScheduled}</span></span>
    {segments > 0 && <span data-habit-segments className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => <span key={index} className={cn("h-1.5 rounded-full transition-all duration-300", index < currentCompleted ? visual.accent : "bg-white/80 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10")} />)}
    </span>}
  </>
}

function MetricProgress({ id, value, visual, reducedMotion }) {
  if (!(["learning", "goals"].includes(id) && Number.isFinite(Number(value)))) return null
  const percent = Math.max(0, Math.min(100, Number(value)))
  return <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200/70 dark:bg-white/10 dark:ring-white/10" aria-hidden="true">
    <motion.div key={String(value)} className={cn("h-full rounded-full", visual.accent)} initial={reducedMotion ? false : { width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: reducedMotion ? 0 : 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
  </div>
}

// A single metric tile. Unavailable metrics remain honest and never animate a fabricated value.
export function MetricTile({ id, label, value, suffix, unavailableNote, available = true, hint, animationKey = "default" }) {
  const visual = VISUALS[id] || VISUALS.focus
  const Icon = visual.icon
  const reducedMotion = useReducedMotionPreference()
  const isHabit = id === "habits"
  const isMood = id === "mood"
  const finalLabel = available && value != null ? `${label}: ${value}${suffix || ""}` : `${label}: ${unavailableNote || "Not enough info for this day."}`

  return (
    <div
      data-metric-card={id}
      className="h-full min-w-0 touch-manipulation transform-gpu transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.015] active:scale-[0.985] motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:active:scale-100"
    >
      <motion.div
        className="h-full"
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : visual.delay, ease: [0.2, 0.8, 0.2, 1] }}
      >
      <Card aria-label={finalLabel} className={cn("group relative h-full min-h-[172px] overflow-hidden shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition-shadow duration-300 hover:shadow-[0_22px_45px_rgba(79,70,229,0.15)] dark:shadow-none", visual.cardClass)}>
        <div className={cn("pointer-events-none absolute -right-8 -top-10 size-28 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-125", visual.glowClass)} />
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1", visual.accent)} />
        <CardContent className="relative flex h-full flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className={cn("grid size-11 place-items-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3", visual.iconClass)}><Icon className="size-5" /></span>
            <span className={cn("mt-1 size-2.5 rounded-full opacity-70 shadow-[0_0_0_5px_rgba(255,255,255,0.55)] dark:shadow-[0_0_0_5px_rgba(255,255,255,0.06)]", visual.accent)} aria-hidden="true" />
          </div>
          <p className={cn("mt-4 text-xs font-extrabold tracking-wide", visual.text)}>{label}</p>
          {available && value != null ? (
            <div className="mt-auto pt-1">
              <p className={cn("font-metric text-2xl font-black tracking-[-0.045em] text-slate-950 dark:text-white sm:text-[27px]", isMood && "origin-left")}>
                {isHabit ? <HabitMetric key={`${animationKey}:${value}`} value={value} reducedMotion={reducedMotion} visual={visual} />
                  : isMood ? <motion.span key={`${animationKey}:${value}`} className="inline-block" initial={reducedMotion ? false : { opacity: 0, scale: 0.86, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.45 }}>{value}<span className="ml-1 text-lg">{suffix}</span></motion.span>
                    : <AnimatedNumber key={`${animationKey}:${value}`} value={value} suffix={suffix} reducedMotion={reducedMotion} />}
              </p>
              <MetricProgress key={`${animationKey}:${value}`} id={id} value={value} visual={visual} reducedMotion={reducedMotion} />
              {hint && <p className="mt-1.5 text-[11px] font-semibold leading-4 text-slate-600/80 dark:text-slate-300/75">{hint}</p>}
            </div>
          ) : (
            <p className="mt-auto pt-4 text-[11px] font-medium italic leading-4 text-slate-600/75 dark:text-slate-300/65">{unavailableNote || "Not enough info for this day."}</p>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </div>
  )
}
