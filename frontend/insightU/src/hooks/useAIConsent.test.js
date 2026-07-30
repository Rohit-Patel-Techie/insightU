import { describe, expect, it } from "vitest"
import { consented } from "@/hooks/useAIConsent"

describe("Journal AI consent state", () => {
  it("grants only current consent with complete provider disclosure", () => {
    expect(consented({ enabled: true, needs_decision: false, disclosure_complete: true, can_enable: true })).toBe(true)
  })

  it("fails closed for stale consent", () => {
    expect(consented({ enabled: true, needs_decision: true, disclosure_complete: true, can_enable: true })).toBe(false)
  })

  it("fails closed when disclosure becomes incomplete", () => {
    expect(consented({ enabled: true, needs_decision: false, disclosure_complete: false, can_enable: false })).toBe(false)
  })
})
