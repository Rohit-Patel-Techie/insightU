import { useCallback, useEffect, useState } from "react"
import { getAIConsent, grantAIConsent, revokeJournalAIConsent } from "@/services/ai-api"

export function consented(payload) {
  if (typeof payload?.enabled === "boolean") return Boolean(
    payload.enabled
    && payload.needs_decision === false
    && payload.disclosure_complete === true
    && payload.can_enable === true
  )
  if (typeof payload?.journal_ai === "boolean") return payload.journal_ai
  if (typeof payload?.journal_ai?.consented === "boolean") return payload.journal_ai.consented
  return Boolean(payload?.services?.includes?.("journal_ai") || payload?.consented_services?.includes?.("journal_ai"))
}

export function useAIConsent() {
  const [state, setState] = useState({ loading: true, granted: false, details: null, error: null })
  const refresh = useCallback(async () => {
    try { const data = await getAIConsent(); setState({ loading: false, granted: consented(data), details: data, error: null }) }
    catch (error) { setState({ loading: false, granted: false, details: null, error }) }
  }, [])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])
  const grant = async () => { const data = await grantAIConsent(); setState({ loading: false, granted: consented(data), details: data, error: null }); return data }
  const revoke = async () => { const data = await revokeJournalAIConsent(); setState({ loading: false, granted: false, details: data, error: null }); return data }
  return { ...state, grant, revoke, refresh }
}
