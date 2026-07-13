import { api } from "@/lib/api";

const API_ROOT = import.meta.env.VITE_API_URL
const CHECKINS_URL = `${API_ROOT}/checkins/`

export async function createDailyCheckIn(payload) {
  const response = await api.post(CHECKINS_URL, payload)
  return response.data
}

export async function listDailyCheckIns(params = {}) {
  const response = await api.get(CHECKINS_URL, { params })
  return response.data
}

export async function getTodayCheckIn() {
  const response = await api.get(`${CHECKINS_URL}today/`)
  return response.data
}

export async function getDailyCheckIn(id) {
  const response = await api.get(`${CHECKINS_URL}${id}/`)
  return response.data
}

export async function updateDailyCheckIn(id, payload) {
  const response = await api.patch(`${CHECKINS_URL}${id}/`, payload)
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

export function getCheckInErrorMessage(error) {
  if (!error.response) return "Unable to reach the server. Check that Django is running and try again."
  if (error.response.status === 401) return "Your session has expired. Please sign in again."
  return firstError(error.response.data) || "The check-in could not be saved. Please try again."
}
