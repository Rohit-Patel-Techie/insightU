"""Behavior context builders.

Transform deterministic evidence into the compact, privacy-safe context object
sent to the provider. This is the single choke point that decides what leaves
the system, so the safety invariants live here:

* No raw check-in prose, profile rows, identity, email, or tokens.
* For ``journal_ai`` ONLY the selected entry's own ``content`` is included --
  never its title, tags, or any history.
* Goal ``title`` (free text) is stripped from the provider context (it may still
  be echoed locally in the API envelope).
* Never derive or emit an INFERRED "best/strongest study time" signal;
  user-declared preferences and reported timing facts are allowed.
* Only current evidence is used (no historical inference beyond the window).
"""
from __future__ import annotations

from .contracts import (
    DAILY_COACH,
    GOAL_COACH,
    JOURNAL_AI,
    PATTERN_DISCOVERY,
    SCORE_EXPLANATION,
    WEEKLY_COACH,
)

# Keys that must never appear in any outbound provider context. These are
# INFERRED-performance signals and free-text identifiers -- reported facts (e.g.
# reported_distraction_time) and declared preferences (preferred_study_time) are
# allowed because they are user-owned, not model-inferred performance claims.
_FORBIDDEN_KEYS = {
    "best_study_time",        # inferred "best/strongest" performance time
    "strongest_study_time",
    "peak_time",
    "title",                  # free-text goal title stays local-only
}


def _scrub(obj):
    if isinstance(obj, dict):
        return {k: _scrub(v) for k, v in obj.items() if k not in _FORBIDDEN_KEYS}
    if isinstance(obj, list):
        return [_scrub(v) for v in obj]
    return obj


def build_context(service: str, evidence: dict) -> dict:
    """Return the exact provider context dict for ``service`` from its evidence."""
    if service == JOURNAL_AI:
        # ONLY the explicitly selected entry content -- no title, tags, history.
        return {"content": evidence.get("content", "")}
    if service in (DAILY_COACH, SCORE_EXPLANATION, GOAL_COACH,
                   PATTERN_DISCOVERY, WEEKLY_COACH):
        return _scrub(dict(evidence))
    raise KeyError(f"Unknown AI service: {service!r}")
