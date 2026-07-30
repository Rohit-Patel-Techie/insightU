"""Habit completion component: completed-due / scheduled-due.

Pure functions operate on plain structures (scheduled codes for the day and the
set of completed codes) so they are testable without the habits app installed.
"""
from __future__ import annotations

import datetime as _dt
from typing import Iterable, Sequence

from .normalization import Component


def scheduled_codes_for_day(habit_defs: Iterable[dict], day: _dt.date) -> list[str]:
    """Return codes of active habits scheduled on ``day``.

    ``habit_defs`` are dicts: {code, schedule_weekdays (ISO 1-7 ints), active}.
    """
    iso = day.isoweekday()
    out: list[str] = []
    for h in habit_defs:
        if not h.get("active", True):
            continue
        weekdays = h.get("schedule_weekdays") or []
        if not weekdays or iso in weekdays:
            out.append(h["code"])
    return out


def habit_completion_component(
    scheduled_codes: Sequence[str],
    completed_codes: Iterable[str],
) -> Component:
    """completed due / scheduled due. Unavailable if none due."""
    scheduled = list(dict.fromkeys(scheduled_codes))
    if not scheduled:
        return Component("habit", available=False,
                         evidence={"reason": "none_due"})
    completed_set = set(completed_codes)
    completed_due = [c for c in scheduled if c in completed_set]
    denom = len(scheduled)
    score = len(completed_due) / denom
    return Component(
        "habit",
        available=True,
        score=score,
        denominator=float(denom),
        evidence={
            "scheduled": scheduled,
            "completed_due": completed_due,
            "scheduled_count": denom,
            "completed_count": len(completed_due),
        },
    )
