"""Compact analytics summary for the LLM + deterministic fallback text.

CRITICAL PRIVACY RULE: the summary intentionally contains ONLY aggregate,
derived numbers (scores, counts, distributions, theme labels, confidence). It
never includes raw check-in free text, reflection prose, or any journal data.
Only this compact summary is ever sent to an LLM.
"""
from __future__ import annotations

import hashlib
import json

from .constants import ANALYTICS_VERSION


def build_summary(dashboard: dict) -> dict:
    """Distill a dashboard payload into a compact, privacy-safe summary."""
    ls = dashboard.get("learning_score", {})
    seven = dashboard.get("seven_day", {})
    comps = dashboard.get("components", {})

    def comp_score(name):
        c = comps.get(name, {})
        return c.get("score") if c.get("available") else None

    goal_source = dashboard.get("goal_alignment", [])
    goal_items = goal_source.get("items", []) if isinstance(goal_source, dict) else goal_source

    summary = {
        "version": ANALYTICS_VERSION,
        "date": dashboard.get("date"),
        "reported": dashboard.get("reported", False),
        "learning_score": ls.get("score"),
        "learning_confidence": ls.get("confidence"),
        "components_used": ls.get("components_used"),
        "component_scores": {
            "study_completion": comp_score("study_completion"),
            "study_hours": comp_score("study_hours"),
            "focus": comp_score("focus"),
            "habit": comp_score("habit"),
            "reflection": comp_score("reflection"),
            "mood": comp_score("mood"),
        },
        "streak": dashboard.get("streak"),
        "seven_day_trend": (seven.get("trend") or {}).get("direction"),
        "seven_day_coverage": (seven.get("coverage") or {}).get("ratio"),
        "top_distractions": list(
            (dashboard.get("distractions", {}).get("by_type", {}) or {}).keys()
        )[:3],
        "reflection_themes": (
            list((dashboard.get("reflection_themes", {}).get("themes", {}) or {}).keys())
            if isinstance(dashboard.get("reflection_themes"), dict)
            else list(dashboard.get("reflection_themes") or [])
        )[:5],
        "goal_alignment": [
            {"category": g.get("category"),
             "score": (g.get("alignment") or {}).get("score")}
            for g in goal_items
        ],
    }
    return summary


def summary_hash(summary: dict) -> str:
    canonical = json.dumps(summary, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def deterministic_fallback(summary: dict) -> str:
    """Rule-based coaching note when no LLM is configured/available.

    Purely descriptive and encouraging: no diagnosis, no causal claims.
    """
    if not summary.get("reported"):
        return (
            "No check-in was recorded for this day, so there is no score to "
            "reflect on. Logging a quick check-in tomorrow will keep your streak "
            "and insights going."
        )
    parts: list[str] = []
    score = summary.get("learning_score")
    conf = summary.get("learning_confidence")
    used = summary.get("components_used")
    if score is not None:
        band = "strong" if score >= 75 else "steady" if score >= 50 else "light"
        parts.append(
            f"Your Learning Score was {score} ({band}), based on {used} tracked "
            f"components ({conf} confidence)."
        )
    cs = summary.get("component_scores", {})
    highs = [k for k, v in cs.items() if v is not None and v >= 0.8]
    lows = [k for k, v in cs.items() if v is not None and v <= 0.4]
    if highs:
        parts.append("Bright spots: " + ", ".join(h.replace("_", " ") for h in highs) + ".")
    if lows:
        parts.append(
            "Areas with room to grow: "
            + ", ".join(l.replace("_", " ") for l in lows)
            + "."
        )
    streak = summary.get("streak")
    if streak:
        parts.append(f"You're on a {streak}-day check-in streak — nice consistency.")
    themes = summary.get("reflection_themes") or []
    if themes:
        parts.append("Recurring reflection themes: " + ", ".join(themes[:3]) + ".")
    parts.append("Keep logging honestly; small consistent steps compound over time.")
    return " ".join(parts)
