import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LearningScoreCard } from "@/components/analytics/LearningScoreCard";

it("opens the score explanation from Why", () => {
  const onWhy = vi.fn();
  render(
    <LearningScoreCard
      score={{
        score: 74,
        components_used: "1/5",
        confidence: "low",
        components: { mood: { available: true, score: 0.8 } },
      }}
      onWhy={onWhy}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Why is this my Learning Score?" }),
  );
  expect(onWhy).toHaveBeenCalledOnce();
});
