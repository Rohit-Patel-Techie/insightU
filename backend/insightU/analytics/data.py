"""ORM-facing data-access layer for the analytics engine.

Everything that touches the database or other apps lives here so the
``services`` package stays pure and unit-testable. Cross-app models that other
agents/the parent will add (habits, goals, extended profile/check-in fields)
are accessed defensively: if a model or field is missing the engine degrades
gracefully and simply reports the affected signal as unavailable.
"""
from __future__ import annotations

import datetime as _dt

from django.apps import apps

from .services.constants import (
    DEFAULT_STUDY_WEEKDAYS,
    DEFAULT_TIMEZONE,
)
from .services.habits import scheduled_codes_for_day

try:  # zoneinfo is stdlib on 3.9+
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None


def _get_model(app_label: str, model_name: str):
    try:
        return apps.get_model(app_label, model_name)
    except Exception:
        return None


# --- Profile / study plan ---------------------------------------------------

def get_profile(user):
    return getattr(user, "profile", None)


def get_profile_settings(user) -> dict:
    """Read study-plan settings defensively (fields added later by parent)."""
    profile = get_profile(user)
    tz = getattr(profile, "timezone", None) or DEFAULT_TIMEZONE
    weekdays = getattr(profile, "study_weekdays", None)
    if not weekdays:
        weekdays = list(DEFAULT_STUDY_WEEKDAYS)
    expected = getattr(profile, "study_hours", 0) or 0
    try:
        expected = float(expected)
    except (TypeError, ValueError):
        expected = 0.0
    return {
        "timezone": tz,
        "study_weekdays": list(weekdays),
        "expected_daily_hours": expected,
        "onboarding_completed": bool(getattr(profile, "onboarding_completed", False)),
    }


def local_today(user) -> _dt.date:
    settings = get_profile_settings(user)
    if ZoneInfo is not None:
        try:
            return _dt.datetime.now(ZoneInfo(settings["timezone"])).date()
        except Exception:
            pass
    return _dt.date.today()


def is_planned_day(day: _dt.date, study_weekdays) -> bool:
    return day.isoweekday() in set(study_weekdays or [])


# --- Check-ins --------------------------------------------------------------

def get_checkins(user, start: _dt.date, end: _dt.date):
    model = _get_model("checkin", "DailyCheckIn")
    if model is None:
        return []
    return list(
        model.objects.filter(
            user=user, check_in_date__gte=start, check_in_date__lte=end
        )
    )


# --- Habits -----------------------------------------------------------------

def get_habit_defs(user) -> list[dict]:
    """Return active habit definitions as plain dicts (empty if app absent)."""
    model = _get_model("habits", "Habit")
    if model is None:
        return []
    defs = []
    qs = model.objects.filter(user=user)
    for habit in qs:
        if getattr(habit, "active", True) is False:
            continue
        defs.append(
            {
                "id": habit.pk,
                "code": getattr(habit, "code", None) or str(habit.pk),
                "name": getattr(habit, "name", ""),
                "schedule_weekdays": list(getattr(habit, "schedule_weekdays", []) or []),
                "active": getattr(habit, "active", True),
            }
        )
    return defs


def _completions_by_date(user, start, end) -> dict[_dt.date, set[str]]:
    """Completed habit codes per date, from HabitCompletion or check-in fallback."""
    hc_model = _get_model("habits", "HabitCompletion")
    result: dict[_dt.date, set[str]] = {}
    if hc_model is not None:
        qs = hc_model.objects.filter(
            user=user, date__gte=start, date__lte=end, completed=True
        ).select_related("habit")
        for comp in qs:
            code = getattr(getattr(comp, "habit", None), "code", None)
            if code:
                result.setdefault(comp.date, set()).add(code)
        return result
    # Fallback: derive completed codes from the check-in habits_completed list.
    for row in get_checkins(user, start, end):
        codes = set(getattr(row, "habits_completed", []) or [])
        if codes:
            result.setdefault(row.check_in_date, set()).update(codes)
    return result


def build_habit_lookup(user, start, end):
    """date -> (scheduled_codes, completed_codes) for the range."""
    defs = get_habit_defs(user)
    completed = _completions_by_date(user, start, end)
    lookup: dict[_dt.date, tuple[list[str], set[str]]] = {}
    day = start
    while day <= end:
        scheduled = scheduled_codes_for_day(defs, day)
        lookup[day] = (scheduled, completed.get(day, set()))
        day += _dt.timedelta(days=1)
    return lookup


# --- Goals ------------------------------------------------------------------

def get_goals(user, statuses=("active",)) -> list[dict]:
    model = _get_model("goals", "Goal")
    if model is None:
        return []
    goals = []
    qs = model.objects.filter(user=user)
    for goal in qs:
        if statuses and getattr(goal, "status", "active") not in statuses:
            continue
        try:
            linked = [
                getattr(h, "code", None) or str(h.pk)
                for h in goal.linked_habits.all()
            ]
        except Exception:
            linked = []
        goals.append(
            {
                "id": goal.pk,
                "title": getattr(goal, "title", ""),
                "category": getattr(goal, "category", None),
                "priority": getattr(goal, "priority", None),
                "status": getattr(goal, "status", "active"),
                "linked_habit_codes": [c for c in linked if c],
            }
        )
    return goals
