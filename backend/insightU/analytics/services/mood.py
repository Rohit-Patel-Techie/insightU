"""Mood component (contextual signal included in the Learning Score; never diagnostic)."""
from __future__ import annotations

from .constants import MOOD_SCORES
from .normalization import Component, DayRecord


def mood_component(rec: DayRecord) -> Component:
    if not rec.reported or rec.mood not in MOOD_SCORES:
        return Component("mood", available=False)
    score = MOOD_SCORES[rec.mood]
    return Component(
        "mood",
        available=True,
        score=score,
        evidence={"mood": rec.mood, "mapped": score},
    )
