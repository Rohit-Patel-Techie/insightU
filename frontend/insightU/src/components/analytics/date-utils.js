// Date-only helpers. Every value is a "YYYY-MM-DD" string in the user's LOCAL
// calendar. We never build Dates from ISO strings (new Date("2026-07-14") is
// parsed as UTC midnight and shifts a day in negative-offset timezones), and we
// never read UTC getters. All parsing/formatting uses local Y/M/D components.

export function formatDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function todayKey(timeZone) {
  if (!timeZone) return formatDateKey(new Date())
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}`
  } catch { return formatDateKey(new Date()) }
}

// Parse a YYYY-MM-DD string into a Date at LOCAL midnight (no UTC shift).
export function parseDateKey(key) {
  if (!key || typeof key !== "string") return null
  const [year, month, day] = key.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function addDays(key, amount) {
  const date = parseDateKey(key)
  if (!date) return key
  date.setDate(date.getDate() + amount)
  return formatDateKey(date)
}

export function isFutureKey(key) {
  return key > todayKey()
}

export function isTodayKey(key) {
  return key === todayKey()
}

export function monthKeyOf(key) {
  return key ? key.slice(0, 7) : currentMonthKey()
}

export function currentMonthKey() {
  return todayKey().slice(0, 7)
}

export function addMonths(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

const LONG = { weekday: "long", month: "long", day: "numeric", year: "numeric" }
const MEDIUM = { month: "short", day: "numeric" }
const MONTH_LABEL = { month: "long", year: "numeric" }

export function formatLong(key) {
  const date = parseDateKey(key)
  return date ? new Intl.DateTimeFormat("en-US", LONG).format(date) : key
}

export function formatMedium(key) {
  const date = parseDateKey(key)
  return date ? new Intl.DateTimeFormat("en-US", MEDIUM).format(date) : key
}

export function formatMonthLabel(monthKey) {
  const [year, month] = (monthKey || "").split("-").map(Number)
  if (!year || !month) return monthKey
  return new Intl.DateTimeFormat("en-US", MONTH_LABEL).format(new Date(year, month - 1, 1))
}
