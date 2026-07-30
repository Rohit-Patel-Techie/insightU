"""Reflection completeness component: answered prompts / prompt count."""
from __future__ import annotations

from .constants import REFLECTION_PROMPT_COUNT
from .normalization import Component, DayRecord


def reflection_component(rec: DayRecord) -> Component:
    if not rec.reported:
        return Component("reflection", available=False)
    answered = sum(
        1
        for text in (rec.reflection_went_well, rec.reflection_improve_tomorrow)
        if text and text.strip()
    )
    score = answered / REFLECTION_PROMPT_COUNT
    return Component(
        "reflection",
        available=True,
        score=score,
        denominator=float(REFLECTION_PROMPT_COUNT),
        evidence={"answered": answered, "prompts": REFLECTION_PROMPT_COUNT},
    )
