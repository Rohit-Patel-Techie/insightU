"""Deterministic reflection theme extraction via a fixed keyword dictionary.

No LLM is involved: themes are derived reproducibly from the keyword map in
constants. This runs before (and independently of) any AI reflection call.
"""
from __future__ import annotations

from collections import Counter
from typing import Iterable

from .constants import REFLECTION_THEME_KEYWORDS
from .normalization import DayRecord


def extract_themes(text: str) -> list[str]:
    """Return the set of themes matched in a single free-text string."""
    if not text:
        return []
    lowered = text.lower()
    found: list[str] = []
    for theme, keywords in REFLECTION_THEME_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            found.append(theme)
    return found


def theme_frequencies(records: Iterable[DayRecord]) -> dict:
    """Count theme occurrences across reflection text in reported days."""
    counter: Counter[str] = Counter()
    days_with_reflection = 0
    for rec in records:
        if not rec.reported:
            continue
        combined = " ".join(
            t for t in (rec.reflection_went_well, rec.reflection_improve_tomorrow) if t
        )
        if not combined.strip():
            continue
        days_with_reflection += 1
        for theme in set(extract_themes(combined)):
            counter[theme] += 1
    return {
        "themes": dict(counter.most_common()),
        "days_with_reflection": days_with_reflection,
    }
