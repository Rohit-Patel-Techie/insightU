import { api } from "@/lib/api"

const REFLECTIONS = "/analytics/reflections/"
export async function listReflections(params = {}) { return (await api.get(REFLECTIONS, { params })).data }
export async function generateReflection(date) { return (await api.post(`${REFLECTIONS}generate/`, { date })).data }
