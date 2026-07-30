"""Focus component (tracked separately from the Learning Score core)."""
from __future__ import annotations

from .constants import FOCUS_SCORES
from .normalization import Component, DayRecord


def focus_component(rec: DayRecord) -> Component:
    if not rec.reported or rec.focus_level not in FOCUS_SCORES:
        return Component("focus", available=False)
    score = FOCUS_SCORES[rec.focus_level]
    return Component(
        "focus",
        available=True,
        score=score,
        evidence={"focus_level": rec.focus_level, "mapped": score},
    )
