export const WEEKDAYS = [
  { value: 1, short: "M", label: "Monday" }, { value: 2, short: "T", label: "Tuesday" },
  { value: 3, short: "W", label: "Wednesday" }, { value: 4, short: "T", label: "Thursday" },
  { value: 5, short: "F", label: "Friday" }, { value: 6, short: "S", label: "Saturday" },
  { value: 7, short: "S", label: "Sunday" },
]
export const CATEGORIES = ["programming", "academics", "exam_prep", "project", "career", "reading", "other"]
export const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
export const todayLocal = (timeZone) => {
  const date = new Date()
  if (timeZone) {
    try { const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}` } catch { /* use browser date */ }
  }
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
export const monthLocal = (date = new Date(), timeZone) => timeZone && date.getTime() === new Date(date).getTime() ? todayLocal(timeZone).slice(0, 7) : (() => { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 7) })()
export const asList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])
export function apiMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data
  if (!data) return error?.message === "Network Error" ? "Unable to reach the server. Check your connection and try again." : fallback
  if (typeof data === "string") return data
  if (typeof data.detail === "string") return data.detail
  const first = Object.values(data).flat(Infinity).find((value) => typeof value === "string")
  return first || fallback
}
export function formatDate(value, options = {}) {
  if (!value) return "—"
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", ...options }).format(date)
}
