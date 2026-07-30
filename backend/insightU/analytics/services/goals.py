"""Goal alignment: mean of AVAILABLE sub-signals for a goal over a period.

Sub-signals (up to 3):
  * category_match — share of reported study days whose study_category matches
    the goal's category.
  * study_completion — average study-completion score across reported days.
  * linked_habit_completion — completed/scheduled for the goal's linked habits,
    averaged across days at least one linked habit is due.

No stored/fabricated progress percentage is ever used. When no sub-signal is
available the alignment is reported as unavailable.
"""
from __future__ import annotations

import datetime as _dt
from typing import Iterable, Mapping, Sequence

from .study import study_completion_component
from .normalization import DayRecord


def goal_alignment(
    category: str | None,
    linked_habit_codes: Sequence[str],
    records: Iterable[DayRecord],
    day_habit_lookup: Mapping[_dt.date, tuple[Sequence[str], Iterable[str]]] | None = None,
) -> dict:
    records = list(records)
    reported = [r for r in records if r.reported]
    linked = list(dict.fromkeys(linked_habit_codes or []))
    day_habit_lookup = day_habit_lookup or {}

    # --- category match ---
    cat_days = [r for r in reported if r.study_category]
    category_match = None
    if category and cat_days:
        matches = sum(1 for r in cat_days if r.study_category == category)
        category_match = {
            "available": True,
            "score": matches / len(cat_days),
            "matched_days": matches,
            "categorized_days": len(cat_days),
        }
    else:
        category_match = {"available": False}

    # --- study completion ---
    comp_scores = [
        study_completion_component(r).score
        for r in reported
        if study_completion_component(r).available
    ]
    if comp_scores:
        study_completion = {
            "available": True,
            "score": sum(comp_scores) / len(comp_scores),
            "days": len(comp_scores),
        }
    else:
        study_completion = {"available": False}

    # --- linked habit completion ---
    linked_habit = {"available": False}
    if linked:
        daily_ratios: list[float] = []
        for r in reported:
            scheduled, completed = day_habit_lookup.get(r.date, ([], []))
            due = [c for c in linked if c in set(scheduled)]
            if not due:
                continue
            completed_set = set(completed)
            done = sum(1 for c in due if c in completed_set)
            daily_ratios.append(done / len(due))
        if daily_ratios:
            linked_habit = {
                "available": True,
                "score": sum(daily_ratios) / len(daily_ratios),
                "due_days": len(daily_ratios),
                "linked_habits": linked,
            }

    subs = [category_match, study_completion, linked_habit]
    avail = [s for s in subs if s.get("available")]
    n = len(avail)
    if n == 0:
        return {
            "available": False,
            "score": None,
            "components_used": "0/3",
            "evidence": {
                "category_match": category_match,
                "study_completion": study_completion,
                "linked_habit_completion": linked_habit,
            },
        }
    mean = sum(s["score"] for s in avail) / n
    return {
        "available": True,
        "score": round(mean * 100, 1),
        "raw_mean": mean,
        "components_used": f"{n}/3",
        "evidence": {
            "category_match": category_match,
            "study_completion": study_completion,
            "linked_habit_completion": linked_habit,
        },
    }
