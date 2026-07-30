import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AIConsentNotice, AIEnvelopeContent, AIInsightCard, CombinedCoachCard } from "@/components/ai/AIInsight"

const envelope = {
  service: "daily_coach", status: "fallback", source: "fallback",
  data: { message: "You kept your check-in habit.", suggestions: ["Start with one focused task."] },
  evidence: { reported_days: 1 }, coverage: { reported_days: 1, total_days: 1 },
}

describe("AI insight presentation", () => {
  it("renders narrative and server evidence separately", () => {
    render(<AIEnvelopeContent envelope={envelope} />)
    expect(screen.getByText("You kept your check-in habit.")).toBeInTheDocument()
    expect(screen.getByText("Start with one focused task.")).toBeInTheDocument()
    expect(screen.getByText("Evidence used")).toBeInTheDocument()
  })

  it("renders one combined daily and adaptive coach", () => {
    render(<CombinedCoachCard insight={{ envelope, phase: "fallback", refetch: vi.fn() }} />)
    expect(screen.getByText("Daily + Adaptive Coach")).toBeInTheDocument()
    expect(screen.queryByText("Adaptive coach", { exact: true })).not.toBeInTheDocument()
  })

  it("keeps an ineligible service explicit", () => {
    render(<AIInsightCard title="Weekly Coach" insight={{ envelope: null, phase: "unavailable", refetch: vi.fn() }} />)
    expect(screen.getByText("This insight is unavailable for the selected period.")).toBeInTheDocument()
  })

  it("renders nested provider consent disclosures", () => {
    render(<AIConsentNotice details={{ disclosure: { provider_name: "Example Provider", privacy_policy_url: "https://example.com/privacy", data_retention: "30 days" } }} />)
    expect(screen.getByText(/Example Provider/)).toBeInTheDocument()
    expect(screen.getByText(/Provider data retention: 30 days/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Provider privacy information" })).toHaveAttribute("href", "https://example.com/privacy")
  })

  it("fails closed when provider disclosure is incomplete", () => {
    render(<AIConsentNotice details={{ disclosure_complete: false, disclosure: { provider_name: null, privacy_policy_url: null, data_retention: null } }} />)
    expect(screen.getByText("Journal AI cannot be enabled yet.")).toBeInTheDocument()
    expect(screen.getByText(/must be configured before you can consent/)).toBeInTheDocument()
  })
})
