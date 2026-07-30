"""Study components: planned-completion and study-hours ratio."""
from __future__ import annotations

from .constants import STUDY_COMPLETION_SCORES
from .normalization import Component, DayRecord


def study_completion_component(rec: DayRecord) -> Component:
    """complete=1, partial=.6, not_today=.2. Unavailable if not reported."""
    if not rec.reported or rec.study_status not in STUDY_COMPLETION_SCORES:
        return Component("study_completion", available=False)
    score = STUDY_COMPLETION_SCORES[rec.study_status]
    return Component(
        "study_completion",
        available=True,
        score=score,
        evidence={"status": rec.study_status, "mapped": score},
    )


def study_hours_component(
    rec: DayRecord,
    expected_hours: float,
    is_planned_day: bool,
) -> Component:
    """min(actual/expected, 1).

    Unavailable when expected <= 0, the day is not a planned study day, or the
    day was not reported.
    """
    if not rec.reported:
        return Component("study_hours", available=False,
                         evidence={"reason": "not_reported"})
    if not is_planned_day:
        return Component("study_hours", available=False,
                         evidence={"reason": "non_planned_day"})
    if not expected_hours or expected_hours <= 0:
        return Component("study_hours", available=False,
                         evidence={"reason": "no_expected_hours"})
    actual = rec.study_hours or 0.0
    score = min(actual / expected_hours, 1.0)
    return Component(
        "study_hours",
        available=True,
        score=score,
        denominator=float(expected_hours),
        evidence={
            "actual_hours": actual,
            "expected_hours": float(expected_hours),
            "ratio": actual / expected_hours,
            "capped": actual > expected_hours,
        },
    )
