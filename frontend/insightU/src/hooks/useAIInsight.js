import { useCallback, useEffect, useRef, useState } from "react"
import { generateAIInsights } from "@/services/ai-api"

export function classifyAIError(error) {
  const status = error?.response?.status
  if (status === 403) return "consent"
  if (status === 429) return "throttled"
  if (status === 404 || status === 422) return "unavailable"
  return "error"
}

export function useAIInsight({ service, anchorDate, enabled = true }) {
  const [state, setState] = useState({ envelope: null, phase: enabled ? "loading" : "idle", error: null })
  const requestRef = useRef(0)

  const load = useCallback(async (force = false) => {
    if (!enabled || !service || !anchorDate) return
    const request = ++requestRef.current
    setState((previous) => ({ ...previous, phase: "loading", error: null }))
    try {
      const result = await generateAIInsights({ anchorDate, services: [service], force })
      const envelope = result.insights?.[service] || null
      const phase = envelope?.status || result.generationStatus || (envelope ? "ready" : "unavailable")
      if (request === requestRef.current) setState({ envelope, phase, error: null })
    } catch (error) {
      if (request === requestRef.current) setState({ envelope: null, phase: classifyAIError(error), error })
    }
  }, [anchorDate, enabled, service])

  useEffect(() => {
    Promise.resolve().then(() => {
      if (enabled) load(false)
      else { requestRef.current += 1; setState({ envelope: null, phase: "idle", error: null }) }
    })
  }, [enabled, load])

  return { ...state, refetch: () => load(false), regenerate: () => load(true) }
}
