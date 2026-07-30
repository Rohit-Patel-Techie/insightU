"""Normalization layer: convert raw check-in rows into plain, ORM-free records.

Keeping the deterministic services decoupled from the ORM makes every formula
unit-testable with plain Python data and keeps the calculations transparent.
"""
from __future__ import annotations

import datetime as _dt
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Iterable, Mapping

from .constants import DEFAULT_STUDY_CATEGORY, STUDY_CATEGORIES


@dataclass(frozen=True)
class DayRecord:
    """A single day of behavioral data in normalized form.

    ``reported`` is False for days with no check-in. Missing days deliberately
    carry no scores and break streaks/coverage.
    """

    date: _dt.date
    reported: bool = False
    study_status: str | None = None
    focus_level: str | None = None
    mood: str | None = None
    day_type: str | None = None
    study_hours: float | None = None
    study_category: str | None = None
    distractions: tuple[str, ...] = ()
    distraction_time: str = ""
    habits_completed: tuple[str, ...] = ()
    reflection_went_well: str = ""
    reflection_improve_tomorrow: str = ""


@dataclass(frozen=True)
class Component:
    """Result of a single deterministic component calculation.

    ``score`` is on a 0..1 scale (or None when unavailable). Every component
    carries ``evidence`` (transparent inputs), and, where meaningful, an
    explicit ``denominator`` so consumers can see how the value was derived.
    """

    name: str
    available: bool
    score: float | None = None
    evidence: Mapping[str, Any] = field(default_factory=dict)
    denominator: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "available": self.available,
            "score": self.score,
            "denominator": self.denominator,
            "evidence": dict(self.evidence),
        }


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_date(value: Any) -> _dt.date:
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    if isinstance(value, str):
        return _dt.date.fromisoformat(value)
    raise TypeError(f"Unsupported date value: {value!r}")


def _clean_category(value: Any) -> str | None:
    if not value:
        return None
    value = str(value)
    return value if value in STUDY_CATEGORIES else DEFAULT_STUDY_CATEGORY


def normalize_checkin(source: Any) -> DayRecord:
    """Normalize a single check-in (ORM instance or mapping) into a DayRecord.

    Reads ``study_category`` defensively via getattr/get so the engine works
    before the parent adds the field (defaulting to ``other``).
    """

    def get(attr: str, default: Any = None) -> Any:
        if isinstance(source, Mapping):
            return source.get(attr, default)
        return getattr(source, attr, default)

    distractions = tuple(get("distractions", []) or [])
    habits = tuple(get("habits_completed", []) or [])
    return DayRecord(
        date=_to_date(get("check_in_date")),
        reported=True,
        study_status=get("planned_study_status") or None,
        focus_level=get("focus_level") or None,
        mood=get("mood") or None,
        day_type=get("day_type") or None,
        study_hours=_to_float(get("study_hours")),
        study_category=_clean_category(get("study_category", DEFAULT_STUDY_CATEGORY)),
        distractions=distractions,
        distraction_time=get("distraction_time", "") or "",
        habits_completed=habits,
        reflection_went_well=get("reflection_went_well", "") or "",
        reflection_improve_tomorrow=get("reflection_improve_tomorrow", "") or "",
    )


def missing_record(day: _dt.date) -> DayRecord:
    """A not-reported placeholder for a day with no check-in."""
    return DayRecord(date=_to_date(day), reported=False)


def build_day_index(
    checkins: Iterable[Any],
    start: _dt.date,
    end: _dt.date,
) -> dict[_dt.date, DayRecord]:
    """Build a complete date -> DayRecord map for [start, end] inclusive.

    Days without a check-in are filled with ``missing_record`` so downstream
    coverage/streak logic can see the gaps explicitly.
    """
    start = _to_date(start)
    end = _to_date(end)
    index: dict[_dt.date, DayRecord] = {}
    for row in checkins:
        rec = normalize_checkin(row)
        index[rec.date] = rec
    day = start
    while day <= end:
        index.setdefault(day, missing_record(day))
        day += _dt.timedelta(days=1)
    return index


def daterange(start: _dt.date, end: _dt.date) -> list[_dt.date]:
    start = _to_date(start)
    end = _to_date(end)
    out: list[_dt.date] = []
    day = start
    while day <= end:
        out.append(day)
        day += _dt.timedelta(days=1)
    return out
