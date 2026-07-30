"""Learning Score: equal-weight mean of AVAILABLE core components * 100.

Core components (5): study completion, study hours, habit, reflection, mood.
Focus is tracked separately by design. Confidence is low whenever fewer than all five are
available. Never fabricates a missing component.
"""
from __future__ import annotations

from typing import Iterable

from .constants import (
    CONFIDENCE_FULL,
    CONFIDENCE_LOW,
    LEARNING_SCORE_COMPONENT_COUNT,
    LEARNING_SCORE_COMPONENTS,
)
from .normalization import Component


def learning_score(components: Iterable[Component]) -> dict:
    by_name = {c.name: c for c in components}
    # Only the five defined core components contribute.
    core = [by_name[name] for name in LEARNING_SCORE_COMPONENTS if name in by_name]
    available = [c for c in core if c.available and c.score is not None]
    n = len(available)
    total = LEARNING_SCORE_COMPONENT_COUNT
    evidence = {
        name: (by_name[name].to_dict() if name in by_name
               else {"name": name, "available": False, "score": None, "evidence": {}})
        for name in LEARNING_SCORE_COMPONENTS
    }
    if n == 0:
        return {
            "available": False,
            "score": None,
            "components_used": f"0/{total}",
            "components_available": 0,
            "components_total": total,
            "confidence": CONFIDENCE_LOW,
            "components": evidence,
        }
    mean = sum(c.score for c in available) / n
    return {
        "available": True,
        "score": round(mean * 100, 1),
        "raw_mean": mean,
        "components_used": f"{n}/{total}",
        "components_available": n,
        "components_total": total,
        "confidence": CONFIDENCE_FULL if n == total else CONFIDENCE_LOW,
        "components": evidence,
    }
