import { api } from "@/lib/api"

const INSIGHTS = "/analytics/ai-insights/"
const CONSENT = "/analytics/ai-consent/"

export const AI_SERVICES = {
  DAILY_COACH: "daily_coach",
  SCORE_EXPLANATION: "score_explanation",
  GOAL_COACH: "goal_coach",
  PATTERN_DISCOVERY: "pattern_discovery",
  WEEKLY_COACH: "weekly_coach",
  JOURNAL_AI: "journal_ai",
}

export function normalizeAIEnvelope(record, service, generationStatus, reason) {
  const value = record?.envelope || record?.insight || record
  const status = value?.status || generationStatus || (value ? "ready" : "unavailable")
  if (!value) return { service, status, data: reason ? { message: String(reason).replaceAll("_", " ") } : null, reason }
  return {
    ...value,
    service: value.service || service,
    status,
    data: value.data ?? value.content ?? null,
    generated_at: value.generated_at || value.created_at || null,
  }
}

function normalizeInsightMap(payload, requestedServices = []) {
  const raw = payload?.insights && typeof payload.insights === "object" ? payload.insights : null
  if (raw) return Object.fromEntries(Object.entries(raw).map(([service, value]) => [service, normalizeAIEnvelope(value, service, payload.generation_status || payload.status, payload.reason)]))
  const service = requestedServices[0] || payload?.insight?.service
  return service ? { [service]: normalizeAIEnvelope(payload?.insight, service, payload?.generation_status || payload?.status, payload?.reason) } : {}
}

export async function listAIInsights(params = {}) {
  const data = (await api.get(INSIGHTS, { params })).data
  if (Array.isArray(data)) return data.map((item) => normalizeAIEnvelope(item, item?.service))
  if (Array.isArray(data?.results)) return { ...data, results: data.results.map((item) => normalizeAIEnvelope(item, item?.service)) }
  return data
}

export async function generateAIInsights({ anchorDate, services, force = false }) {
  const payload = { anchor_date: anchorDate, services }
  if (force) payload.force = true
  const data = (await api.post(`${INSIGHTS}generate/`, payload)).data || {}
  return { insights: normalizeInsightMap(data, services), generationStatus: data.generation_status || data.status || null }
}

export async function getAIConsent() { return (await api.get(CONSENT)).data }
export async function grantAIConsent() { return (await api.post(CONSENT, { enabled: true })).data }
export async function revokeJournalAIConsent() { return (await api.delete(`${CONSENT}journal_ai/`)).data }

export async function generateJournalAI(id) {
  const data = (await api.post(`/journal/${id}/ai/`)).data || {}
  return normalizeAIEnvelope(data, AI_SERVICES.JOURNAL_AI, data.generation_status || data.status, data.reason || data.evidence?.reason)
}
export async function deleteJournalAI(id) { return (await api.delete(`/journal/${id}/ai/`)).data }
