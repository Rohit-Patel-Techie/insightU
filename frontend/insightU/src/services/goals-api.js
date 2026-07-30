import { api } from "@/lib/api"

const GOALS = "/goals/"
export async function listGoals(params = {}) { return (await api.get(GOALS, { params })).data }
export async function createGoal(payload) { return (await api.post(GOALS, payload)).data }
export async function updateGoal(id, payload) { return (await api.patch(`${GOALS}${id}/`, payload)).data }
export async function archiveGoal(id) { return (await api.delete(`${GOALS}${id}/`)).data }
