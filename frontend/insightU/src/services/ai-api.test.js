import { describe, expect, it } from "vitest"
import { AI_SERVICES, normalizeAIEnvelope } from "@/services/ai-api"

describe("AI API contract", () => {
  it("uses only backend-supported services", () => {
    expect(Object.values(AI_SERVICES)).toEqual([
      "daily_coach", "score_explanation", "goal_coach",
      "pattern_discovery", "weekly_coach", "journal_ai",
    ])
  })

  it("normalizes stored content as narrative data", () => {
    const result = normalizeAIEnvelope({ service: "daily_coach", content: { message: "Keep going" }, source: "fallback" }, "daily_coach", "cache_hit")
    expect(result.data).toEqual({ message: "Keep going" })
    expect(result.status).toBe("cache_hit")
    expect(result.source).toBe("fallback")
  })

  it("preserves deterministic unavailable reasons", () => {
    const result = normalizeAIEnvelope(null, "weekly_coach", "ineligible", "needs_three_reported_days")
    expect(result.status).toBe("ineligible")
    expect(result.reason).toBe("needs_three_reported_days")
  })
})
