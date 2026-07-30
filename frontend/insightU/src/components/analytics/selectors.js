import { formatMedium } from "@/components/analytics/date-utils"

// Human labels for the categorical check-in fields (mirrors backend choices).
export const FOCUS_LABELS = { deep: "Deep focus", mostly: "Mostly focused", average: "Average", frequently: "Often distracted", could_not: "Couldn't focus" }
export const MOOD_LABELS = { excellent: "Excellent", good: "Good", okay: "Okay", low: "Low", stressed: "Stressed" }
export const STUDY_STATUS_LABELS = { complete: "Completed as planned", partial: "Partially completed", not_today: "Didn't study today" }

export const MOOD_EMOJI = { excellent: "😄", good: "😊", okay: "😐", low: "🙁", stressed: "😣" }

export function titleize(value) {
  if (!value) return ""
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// Adds a short axis `label` to each point using its date, without UTC shift.
function withLabels(points = []) {
  return points.map((point) => ({ ...point, label: point.label || (point.date ? formatMedium(point.date) : "") }))
}

// --- Overview response -> chart-ready structures (all defensive) ---
export function selectLearningScoreTrend(overview) {
  const trend = overview?.learning_score_trend || {}
  return { points: withLabels(trend.points), direction: trend.direction || null, average: trend.average ?? null }
}

export function selectStudyTrend(overview) {
  const raw = overview?.study_trend?.points || overview?.study_trend || []
  return withLabels(raw.map((p) => ({
    ...p,
    hours: p.reported ? (p.hours ?? p.study_hours ?? null) : null,
    focus: p.reported ? (p.focus ?? p.focus_value ?? null) : null,
  })))
}

export function selectMoodTrend(overview) {
  const raw = overview?.mood_trend?.points || overview?.mood_trend || []
  return withLabels(raw.map((p) => ({ ...p, value: p.value ?? null, label: p.label })))
}

export function selectFocusDistribution(overview) {
  const dist = overview?.focus_distribution || {}
  const buckets = (dist.buckets || []).map((b) => ({
    key: b.key, label: b.label || FOCUS_LABELS[b.key] || titleize(b.key), count: b.count || 0,
  }))
  return { buckets, average: dist.average ?? null }
}

export function selectHabitSummary(overview) {
  return (overview?.habit_summary?.items || overview?.habit_summary || []).map((h) => ({
    name: h.name,
    completed: h.completed ?? null,
    scheduled: h.scheduled ?? null,
    rate: h.rate != null ? h.rate : (h.scheduled ? Math.round((h.completed / h.scheduled) * 100) : null),
  }))
}

export function selectDistractions(source) {
  const items = source?.distractions?.items || source?.distractions || []
  return items.map((d) => ({ label: d.label || titleize(d.key), count: d.count || 0 })).sort((a, b) => b.count - a.count)
}
