import { api } from "@/lib/api"

const JOURNAL = "/journal/"
export async function listJournalEntries(params = {}) { return (await api.get(JOURNAL, { params })).data }
export async function getJournalEntry(id) { return (await api.get(`${JOURNAL}${id}/`)).data }
export async function createJournalEntry(payload) { return (await api.post(JOURNAL, payload)).data }
export async function updateJournalEntry(id, payload) { return (await api.patch(`${JOURNAL}${id}/`, payload)).data }
export async function deleteJournalEntry(id) { return (await api.delete(`${JOURNAL}${id}/`)).data }
