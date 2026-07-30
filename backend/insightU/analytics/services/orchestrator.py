"""Assembles component services into dashboard/overview/calendar payloads.

Pure with respect to the DB: it receives already-fetched, normalized inputs via
the small structs below (built by :mod:`analytics.data`). This keeps assembly
logic transparent and unit-testable.
"""
from __future__ import annotations

import datetime as _dt
from collections import Counter
from typing import Mapping, Sequence

from . import trends as trends_mod
from .constants import FOCUS_SCORES, MOOD_SCORES
from .distractions import distraction_frequencies
from .focus import focus_component
from .goals import goal_alignment
from .habits import habit_completion_component
from .mood import mood_component
from .normalization import Component, DayRecord, daterange
from .reflection import reflection_component
from .reflection_themes import theme_frequencies
from .score import learning_score
from .study import study_completion_component, study_hours_component


def day_components(rec, settings, habit_lookup):
    """Return the six components for a single day keyed by name."""
    planned = rec.date.isoweekday() in set(settings["study_weekdays"])
    scheduled, completed = habit_lookup.get(rec.date, ([], set()))
    comps = {
        "study_completion": study_completion_component(rec),
        "study_hours": study_hours_component(
            rec, settings["expected_daily_hours"], planned
        ),
        "focus": focus_component(rec),
        "habit": habit_completion_component(scheduled, completed) if rec.reported else Component("habit", available=False, evidence={"reason": "not_reported"}),
        "reflection": reflection_component(rec),
        "mood": mood_component(rec),
    }
    return comps


def _core(comps):
    return [comps[n] for n in ("study_completion", "study_hours", "habit", "reflection", "mood")]


def _daily_score_series(index, settings, habit_lookup, start, end):
    series = []
    for d in daterange(start, end):
        rec = index[d]
        if not rec.reported:
            series.append({"date": d.isoformat(), "reported": False, "score": None})
            continue
        ls = learning_score(_core(day_components(rec, settings, habit_lookup)))
        series.append(
            {"date": d.isoformat(), "reported": True, "score": ls["score"],
             "confidence": ls["confidence"], "components_used": ls["components_used"]}
        )
    return series


def _coverage(index, start, end):
    days = daterange(start, end)
    reported = sum(1 for d in days if index[d].reported)
    return {"reported": reported, "total": len(days),
            "ratio": reported / len(days) if days else 0.0}


def current_streak(reported_dates: set, anchor: _dt.date) -> int:
    streak = 0
    day = anchor
    while day in reported_dates:
        streak += 1
        day -= _dt.timedelta(days=1)
    return streak


def _level_distribution(records, attr, score_map):
    counter = Counter()
    for rec in records:
        if not rec.reported:
            continue
        val = getattr(rec, attr)
        if val in score_map:
            counter[val] += 1
    return dict(counter)


def _goal_alignments(goals, records, habit_lookup):
    out = []
    for g in goals:
        alignment = goal_alignment(
            g.get("category"), g.get("linked_habit_codes", []), records, habit_lookup
        )
        out.append({
            "goal_id": g.get("id"),
            "title": g.get("title"),
            "category": g.get("category"),
            "alignment": alignment,
        })
    return out


def build_dashboard(*, day, index, settings, habit_lookup, goals,
                    reported_dates_extended):
    """Single-day dashboard for ``day``.

    ``index`` covers a trailing window (>= 7 days) ending at ``day``.
    ``reported_dates_extended`` is a set of reported dates over a longer lookback
    used only for streak calculation.
    """
    rec = index[day]
    comps = day_components(rec, settings, habit_lookup)
    ls = learning_score(_core(comps))

    window = daterange(day - _dt.timedelta(days=6), day)
    window_records = [index[d] for d in window]
    series = _daily_score_series(index, settings, habit_lookup,
                                 day - _dt.timedelta(days=6), day)
    trend_result = trends_mod.trend([s["score"] for s in series if s["reported"]])

    return {
        "date": day.isoformat(),
        "reported": rec.reported,
        "check_in_summary": _checkin_summary(rec),
        "learning_score": ls,
        "components": {name: c.to_dict() for name, c in comps.items()},
        "mood": comps["mood"].to_dict(),
        "focus": comps["focus"].to_dict(),
        "study_hours": comps["study_hours"].to_dict(),
        "streak": current_streak(reported_dates_extended, day),
        "seven_day": {
            "series": series,
            "trend": trend_result,
            "coverage": _coverage(index, day - _dt.timedelta(days=6), day),
        },
        "distractions": distraction_frequencies(window_records),
        "reflection_themes": theme_frequencies(window_records),
        "goal_alignment": _goal_alignments(goals, [rec], habit_lookup),
    }


def _checkin_summary(rec: DayRecord) -> dict | None:
    if not rec.reported:
        return None
    return {
        "study_status": rec.study_status,
        "study_hours": rec.study_hours,
        "study_category": rec.study_category,
        "focus_level": rec.focus_level,
        "mood": rec.mood,
        "day_type": rec.day_type,
        "distractions": list(rec.distractions),
        "distraction_time": rec.distraction_time,
        "habits_completed": list(rec.habits_completed),
        "has_reflection": bool(
            (rec.reflection_went_well or "").strip()
            or (rec.reflection_improve_tomorrow or "").strip()
        ),
    }


def build_overview(*, period, start, end, index, settings, habit_lookup, goals):
    days = daterange(start, end)
    records = [index[d] for d in days]
    reported = [r for r in records if r.reported]

    series = _daily_score_series(index, settings, habit_lookup, start, end)
    reported_scores = [s["score"] for s in series if s["reported"] and s["score"] is not None]
    avg_score = sum(reported_scores) / len(reported_scores) if reported_scores else None

    # component averages across reported days
    comp_totals: dict[str, list[float]] = {}
    for rec in reported:
        for name, c in day_components(rec, settings, habit_lookup).items():
            if c.available and c.score is not None:
                comp_totals.setdefault(name, []).append(c.score)
    comp_averages = {
        name: {"average": sum(v) / len(v), "days": len(v)}
        for name, v in comp_totals.items()
    }

    total_hours = sum((r.study_hours or 0.0) for r in reported)

    return {
        "period": period,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "coverage": _coverage(index, start, end),
        "average_learning_score": round(avg_score, 1) if avg_score is not None else None,
        "learning_score_trend": trends_mod.trend(reported_scores),
        "component_averages": comp_averages,
        "series": series,
        "study_hours_total": round(total_hours, 1),
        "focus_distribution": _level_distribution(records, "focus_level", FOCUS_SCORES),
        "mood_distribution": _level_distribution(records, "mood", MOOD_SCORES),
        "distractions": distraction_frequencies(records),
        "reflection_themes": theme_frequencies(records),
        "goal_alignment": _goal_alignments(goals, records, habit_lookup),
    }


def build_calendar(*, year, month, start, end, index, settings, habit_lookup, today):
    days = daterange(start, end)
    cells = []
    for d in days:
        rec = index[d]
        if d > today:
            cells.append({"date": d.isoformat(), "status": "future", "score": None})
            continue
        if not rec.reported:
            cells.append({"date": d.isoformat(), "status": "not_reported", "score": None})
            continue
        ls = learning_score(_core(day_components(rec, settings, habit_lookup)))
        cells.append({
            "date": d.isoformat(),
            "status": "reported",
            "score": ls["score"],
            "confidence": ls["confidence"],
            "components_used": ls["components_used"],
        })
    return {
        "month": f"{year:04d}-{month:02d}",
        "start": start.isoformat(),
        "end": end.isoformat(),
        "coverage": _coverage(
            index, start, min(end, today) if today >= start else start
        ) if today >= start else {"reported": 0, "total": len(days), "ratio": 0.0},
        "days": cells,
    }
