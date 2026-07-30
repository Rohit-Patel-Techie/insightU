/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react"
import { Target } from "lucide-react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { InsufficientDataState } from "@/components/analytics/AnalyticsStates"

export const CHART_COLORS = {
  indigo: "#7c6cf2",
  emerald: "#2cc98f",
  amber: "#f59e0b",
  sky: "#38a8ed",
  rose: "#f05d79",
  violet: "#8b6fe8",
  slate: "#94a3b8",
}

const FOCUS_PALETTE = [CHART_COLORS.indigo, CHART_COLORS.emerald, CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.slate]

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener?.("change", update)
    return () => query.removeEventListener?.("change", update)
  }, [])
  return reduced
}

const AXIS_STYLE = { fontSize: 11, fill: "currentColor" }
const GRID_CLASS = "text-slate-200 dark:text-white/10"

function ChartTooltip({ active, payload, label, unit = "", formatValue }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#1b1f30]">
      {label != null && <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="size-2 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
          <span className="font-medium text-slate-600 dark:text-slate-300">{entry.name}:</span>
          {entry.value == null ? "not reported" : formatValue ? formatValue(entry.value) : `${entry.value}${unit}`}
        </p>
      ))}
    </div>
  )
}

// Wraps every chart with an accessible text summary for screen readers.
function ChartFigure({ label, summary, height = 240, children }) {
  return (
    <figure role="group" aria-label={label} className="w-full">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      {summary && <figcaption className="sr-only">{summary}</figcaption>}
    </figure>
  )
}

// ---- Learning Score trend (line) ----------------------------------------
export function LearningScoreTrendChart({ data, minPoints = 4, height = 240 }) {
  const reduced = usePrefersReducedMotion()
  const reported = (data || []).filter((d) => d.value != null)
  if (reported.length < minPoints) {
    return <InsufficientDataState reason={`Learning Score trends need at least ${minPoints} reported days (${reported.length} so far).`} />
  }
  return (
    <ChartFigure label="Learning Score trend" height={height}
      summary={`Learning Score across ${data.length} days, ${reported.length} reported, ranging ${Math.min(...reported.map((d) => d.value))} to ${Math.max(...reported.map((d) => d.value))}.`}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid strokeDasharray="4 7" className={GRID_CLASS} stroke="currentColor" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={<ChartTooltip unit="/100" />} />
        <Line type="monotone" dataKey="value" name="Learning Score" stroke={CHART_COLORS.indigo} strokeWidth={3}
          dot={{ r: 3 }} connectNulls={false} isAnimationActive={!reduced} />
      </LineChart>
    </ChartFigure>
  )
}

// ---- Study hours + focus (area + line) -----------------------------------
export function StudyTrendChart({ data }) {
  const reduced = usePrefersReducedMotion()
  const reported = (data || []).filter((d) => d.reported)
  if (reported.length === 0) {
    return <InsufficientDataState reason="No reported study days in this range yet." />
  }
  return (
    <ChartFigure label="Study hours and focus trend" height={260}
      summary={`Study hours and focus score over ${data.length} days with ${reported.length} reported.`}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <defs>
          <linearGradient id="studyHoursFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CHART_COLORS.indigo} stopOpacity="0.3" />
            <stop offset="1" stopColor={CHART_COLORS.indigo} stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 7" className={GRID_CLASS} stroke="currentColor" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis yAxisId="hours" domain={[0, "auto"]} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
        <YAxis yAxisId="focus" orientation="right" domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area yAxisId="hours" type="monotone" dataKey="hours" name="Study hours" stroke={CHART_COLORS.indigo}
          strokeWidth={3} fill="url(#studyHoursFill)" connectNulls={false} isAnimationActive={!reduced} />
        <Line yAxisId="focus" type="monotone" dataKey="focus" name="Focus score" stroke={CHART_COLORS.emerald}
          strokeWidth={2.5} strokeDasharray="6 5" dot={false} connectNulls={false} isAnimationActive={!reduced} />
      </ComposedChart>
    </ChartFigure>
  )
}

// ---- Mood trend (line) ----------------------------------------------------
export function MoodTrendChart({ data, minPoints = 4 }) {
  const reduced = usePrefersReducedMotion()
  const reported = (data || []).filter((d) => d.value != null)
  if (reported.length < minPoints) {
    return <InsufficientDataState reason={`Mood trends need at least ${minPoints} reported days (${reported.length} so far).`} />
  }
  return (
    <ChartFigure label="Mood trend" height={200}
      summary={`Mood scores across ${data.length} days with ${reported.length} reported.`}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
        <CartesianGrid strokeDasharray="4 6" className={GRID_CLASS} stroke="currentColor" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 1]} ticks={[0.2, 0.4, 0.6, 0.8, 1]} tick={AXIS_STYLE} tickLine={false} axisLine={false} width={32} />
        <Tooltip content={<ChartTooltip formatValue={(v) => v} />} />
        <Line type="monotone" dataKey="value" name="Mood" stroke={CHART_COLORS.violet} strokeWidth={3}
          dot={{ r: 3 }} connectNulls={false} isAnimationActive={!reduced} />
      </LineChart>
    </ChartFigure>
  )
}

// ---- Focus distribution (donut) ------------------------------------------
export function FocusDistributionChart({ data, average }) {
  const reduced = usePrefersReducedMotion()
  const items = data || []
  const total = items.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
  if (total === 0) {
    return <InsufficientDataState reason="No focus levels reported in this range yet." />
  }
  const activeCount = items.filter((item) => (Number(item.count) || 0) > 0).length
  const dominant = [...items].sort((a, b) => (b.count || 0) - (a.count || 0))[0]
  const summary = items.map((item) => `${item.label} ${item.count || 0} days, ${Math.round(((item.count || 0) / total) * 100)}%`).join(", ")
  const tints = [
    "bg-indigo-50 dark:bg-indigo-400/[0.07]",
    "bg-emerald-50 dark:bg-emerald-400/[0.07]",
    "bg-amber-50 dark:bg-amber-400/[0.07]",
    "bg-rose-50 dark:bg-rose-400/[0.07]",
    "bg-slate-100 dark:bg-white/[0.05]",
  ]
  return (
    <div className="grid items-center gap-5 md:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1.1fr)]">
      <div className="relative overflow-hidden rounded-[24px] border border-indigo-100/80 bg-gradient-to-br from-indigo-50 via-white to-sky-50/70 p-4 dark:border-indigo-400/10 dark:from-indigo-400/[0.08] dark:via-white/[0.025] dark:to-sky-400/[0.05]">
        <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300"><Target className="size-4" />Focus balance</div>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-white/[0.07] dark:text-slate-300">{total} {total === 1 ? "day" : "days"}</span>
        </div>
        <div className="relative mx-auto mt-1 w-full max-w-[238px]">
          <ChartFigure label="Focus distribution" height={218} summary={`Focus distribution across ${total} reported days: ${summary}.`}>
            <PieChart>
              <defs>
                <filter id="focusDonutShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#6366f1" floodOpacity="0.18" /></filter>
              </defs>
              <Pie data={items} dataKey="count" nameKey="label" innerRadius={66} outerRadius={94}
                paddingAngle={activeCount > 1 ? 3 : 0} cornerRadius={activeCount > 1 ? 7 : 0} stroke="none" filter="url(#focusDonutShadow)" isAnimationActive={!reduced}>
                {items.map((entry, index) => <Cell key={entry.key ?? entry.label} fill={FOCUS_PALETTE[index % FOCUS_PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip formatValue={(v) => `${v} ${v === 1 ? "day" : "days"} · ${Math.round((v / total) * 100)}%`} />} />
            </PieChart>
          </ChartFigure>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-metric text-3xl font-medium tracking-[-0.08em] text-slate-950 dark:text-white">{average != null ? Math.round(average) : "—"}<span className="ml-1 text-xs tracking-normal text-slate-400">/100</span></p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.17em] text-slate-400">average focus</p>
            </div>
          </div>
        </div>
        <div className="relative -mt-1 rounded-2xl border border-white/90 bg-white/75 px-3 py-2.5 text-center shadow-sm backdrop-blur dark:border-white/[0.06] dark:bg-white/[0.04]">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Most common</p>
          <p className="font-display mt-0.5 text-xs font-extrabold text-slate-800 dark:text-white">{dominant?.label}</p>
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="font-display text-sm font-extrabold text-slate-900 dark:text-white">Where your focus landed</p><p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Share of reported days</p></div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distribution</span>
        </div>
        <ul className="space-y-2" aria-label="Focus distribution details">
          {items.map((entry, index) => {
            const count = Number(entry.count) || 0
            const percent = Math.round((count / total) * 100)
            return (
              <li key={entry.key ?? entry.label} className={`rounded-2xl px-3 py-2.5 ${tints[index % tints.length]}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><span className="size-2.5 shrink-0 rounded-full shadow-sm" style={{ background: FOCUS_PALETTE[index % FOCUS_PALETTE.length] }} /><span className="truncate">{entry.label}</span></span>
                  <span className="font-metric shrink-0 text-[11px] font-medium text-slate-700 dark:text-slate-200">{count}d · {percent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/90 shadow-inner dark:bg-white/[0.07]">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${percent}%`, background: FOCUS_PALETTE[index % FOCUS_PALETTE.length] }} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ---- Habit completion (horizontal bars) ----------------------------------
export function HabitCompletionChart({ data }) {
  const reduced = usePrefersReducedMotion()
  const withRate = (data || []).filter((item) => item.rate != null)
  if (withRate.length === 0) {
    return <InsufficientDataState reason="No habits were due in this range, so completion can't be calculated." />
  }
  return (
    <ChartFigure label="Habit completion rates" height={Math.max(160, withRate.length * 42)}
      summary={withRate.map((item) => `${item.name} ${item.rate}%`).join(", ")}>
      <BarChart data={withRate} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="4 7" className={GRID_CLASS} stroke="currentColor" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={110} />
        <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
        <Bar dataKey="rate" name="Completed" fill={CHART_COLORS.emerald} radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={!reduced} />
      </BarChart>
    </ChartFigure>
  )
}

// ---- Distraction frequency (bars, COUNTS only — never durations) ---------
export function DistractionFrequencyChart({ data }) {
  const reduced = usePrefersReducedMotion()
  const items = (data || []).filter((item) => (item.count || 0) > 0)
  if (items.length === 0) {
    return <InsufficientDataState reason="No distractions were logged in this range." />
  }
  return (
    <ChartFigure label="Distraction frequency" height={Math.max(160, items.length * 40)}
      summary={items.map((item) => `${item.label} reported ${item.count} ${item.count === 1 ? "time" : "times"}`).join(", ")}>
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="4 7" className={GRID_CLASS} stroke="currentColor" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={110} />
        <Tooltip content={<ChartTooltip formatValue={(v) => `${v} ${v === 1 ? "time" : "times"}`} />} cursor={{ fill: "currentColor", opacity: 0.05 }} />
        <Bar dataKey="count" name="Times reported" fill={CHART_COLORS.rose} radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={!reduced} />
      </BarChart>
    </ChartFigure>
  )
}
