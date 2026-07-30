import { api } from "@/lib/api"

const HABITS = "/habits/"
const COMPLETIONS = "/habits/completions/"

export async function listHabits(params = {}) { return (await api.get(HABITS, { params })).data }
export async function createHabit(payload) { return (await api.post(HABITS, payload)).data }
export async function updateHabit(id, payload) { return (await api.patch(`${HABITS}${id}/`, payload)).data }
export async function archiveHabit(id) { return (await api.delete(`${HABITS}${id}/`)).data }
export async function listHabitCompletions(params = {}) { return (await api.get(COMPLETIONS, { params })).data }
export async function setHabitCompletion(payload) { return (await api.post(COMPLETIONS, payload)).data }
export async function updateHabitCompletion(id, payload) { return (await api.patch(`${COMPLETIONS}${id}/`, payload)).data }
export async function getHabitCalendar(month) { return (await api.get(`${HABITS}calendar/`, { params: { month } })).data }
