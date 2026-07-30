import { api } from "@/lib/api"

// All analytics endpoints are IsAuthenticated + user-scoped on the backend.
// We call them through the shared `api` instance (relative paths) so the JWT
// access token and the refresh-queue interceptor are applied automatically.
//
// See the integration report / contracts.md for the expected response shapes.
// The UI reads these defensively — any missing field degrades to an honest
// "unavailable" / "not reported" state rather than a fabricated number.

const ANALYTICS = "/analytics"

// GET /api/analytics/dashboard/?date=YYYY-MM-DD
export async function getDashboard(date) {
  const response = await api.get(`${ANALYTICS}/dashboard/`, { params: { date } })
  return response.data
}

// GET /api/analytics/overview/?period=week|month&anchor_date=YYYY-MM-DD
export async function getOverview({ period = "week", anchorDate } = {}) {
  const response = await api.get(`${ANALYTICS}/overview/`, {
    params: { period, anchor_date: anchorDate },
  })
  return response.data
}

// GET /api/analytics/calendar/?month=YYYY-MM
export async function getAnalyticsCalendar(month) {
  const response = await api.get(`${ANALYTICS}/calendar/`, { params: { month } })
  return response.data
}

// GET /api/analytics/reflections/  (cached list)
export async function listReflections(params = {}) {
  const response = await api.get(`${ANALYTICS}/reflections/`, { params })
  return response.data
}

// POST /api/analytics/reflections/generate/  { date }
export async function generateReflection(date) {
  const response = await api.post(`${ANALYTICS}/reflections/generate/`, { date })
  return response.data
}

function firstError(value) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.length ? firstError(value[0]) : ""
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const message = firstError(item)
      if (message) return message
    }
  }
  return ""
}

export function getAnalyticsErrorMessage(error) {
  if (!error?.response) return "Unable to reach the server. Check your connection and try again."
  if (error.response.status === 401) return "Your session has expired. Please sign in again."
  if (error.response.status === 404) return "Analytics aren't available yet. This feature may still be connecting."
  return firstError(error.response.data) || "We couldn't load your analytics. Please try again."
}
