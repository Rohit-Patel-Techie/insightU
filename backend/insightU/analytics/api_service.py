"""ORM-to-analytics orchestration and stable API response adapters."""
from __future__ import annotations

import datetime as dt
import hashlib
from collections import Counter

from . import data
from .models import AIReflection
from .services import orchestrator
from .services.ai import provider
from .services.constants import ANALYTICS_VERSION, FOCUS_SCORES, MOOD_SCORES
from .services.llm import generate_reflection_text
from .services.monthly import month_bounds
from .services.normalization import build_day_index
from .services.summary import build_summary, summary_hash
from .services.weekly import week_bounds

STREAK_LOOKBACK_DAYS = 400


def _habit_items(day, habit_defs, habit_lookup):
    scheduled, completed = habit_lookup.get(day, ([], set()))
    names = {item["code"]: item["name"] for item in habit_defs}
    return [{"code": code, "name": names.get(code, code.replace("_", " ").title()), "completed": code in set(completed)} for code in scheduled]


def _goal_summary(items):
    if not items:
        return {"configured": False, "available": False, "value": None, "items": []}
    available = [item for item in items if item["alignment"].get("available")]
    value = sum(item["alignment"]["score"] for item in available) / len(available) / 100 if available else None
    return {"configured": True, "available": bool(available), "value": value, "items": items}


def _dashboard_contract(user, day, raw, settings, habit_defs, habit_lookup):
    components = raw["components"]
    summary = raw.get("check_in_summary") or {}
    habit_component = components["habit"]
    habit_items = _habit_items(day, habit_defs, habit_lookup)
    latest_reflection = AIReflection.objects.filter(user=user, date=day).first()
    learning = dict(raw["learning_score"])
    learning["value"] = learning.get("score")
    raw.update({
        "is_planned_day": day.isoweekday() in set(settings["study_weekdays"]),
        "learning_score": learning,
        "study": {
            "hours": summary.get("study_hours"),
            "completion_status": summary.get("study_status"),
            "category": summary.get("study_category"),
            "component": components["study_hours"],
        },
        "focus": {
            "available": components["focus"]["available"],
            "value": components["focus"].get("score"),
            "level": summary.get("focus_level"),
        },
        "mood": {
            "available": components["mood"]["available"],
            "value": components["mood"].get("score"),
            "label": summary.get("mood"),
        },
        "habits": {
            "available": habit_component["available"],
            "completed": habit_component.get("evidence", {}).get("completed_count", 0),
            "scheduled": habit_component.get("evidence", {}).get("scheduled_count", 0),
            "items": habit_items,
        },
        "goal_alignment": _goal_summary(raw.get("goal_alignment", [])),
        "distractions": {**raw["distractions"], "items": [{"key": key, "label": key.replace("_", " ").title(), "count": count} for key, count in raw["distractions"]["by_type"].items()]},
        "reflection_themes": list(raw["reflection_themes"]["themes"].keys()),
        "ai_reflection": ({"id": latest_reflection.pk, "summary": latest_reflection.content, "source": latest_reflection.source} if latest_reflection else None),
    })
    return raw


def assemble_dashboard(user, day: dt.date) -> dict:
    settings = data.get_profile_settings(user)
    window_start = day - dt.timedelta(days=6)
    checkins = data.get_checkins(user, window_start, day)
    index = build_day_index(checkins, window_start, day)
    habit_lookup = data.build_habit_lookup(user, window_start, day)
    habit_defs = data.get_habit_defs(user)
    goals = data.get_goals(user)
    streak_start = day - dt.timedelta(days=STREAK_LOOKBACK_DAYS)
    reported_dates = {item.check_in_date for item in data.get_checkins(user, streak_start, day)}
    raw = orchestrator.build_dashboard(day=day, index=index, settings=settings, habit_lookup=habit_lookup, goals=goals, reported_dates_extended=reported_dates)
    return _dashboard_contract(user, day, raw, settings, habit_defs, habit_lookup)


def _habit_summary(habit_defs, habit_lookup, start, end):
    out = []
    day_count = (end - start).days + 1
    for habit in habit_defs:
        scheduled = completed = 0
        for offset in range(day_count):
            day = start + dt.timedelta(days=offset)
            due, done = habit_lookup.get(day, ([], set()))
            if habit["code"] in due:
                scheduled += 1
                completed += int(habit["code"] in set(done))
        out.append({"id": habit["id"], "name": habit["name"], "completed": completed, "scheduled": scheduled, "rate": round(completed / scheduled * 100, 1) if scheduled else None})
    return out


def _safe_growth(current, prior):
    if current is None or prior is None or prior == 0:
        return {"available": False, "value": None}
    return {"available": True, "value": round((current - prior) / abs(prior) * 100, 1)}


def _period_snapshot(user, start, end, settings):
    checkins = data.get_checkins(user, start, end)
    index = build_day_index(checkins, start, end)
    lookup = data.build_habit_lookup(user, start, end)
    raw = orchestrator.build_overview(period="comparison", start=start, end=end, index=index, settings=settings, habit_lookup=lookup, goals=[])
    habit_rates = [item["rate"] for item in _habit_summary(data.get_habit_defs(user), lookup, start, end) if item["rate"] is not None]
    return {"study_hours": raw["study_hours_total"], "learning_score": raw["average_learning_score"], "habit_completion": sum(habit_rates)/len(habit_rates) if habit_rates else None, "coverage": raw["coverage"]["ratio"]*100}


def assemble_overview(user, period: str, anchor: dt.date) -> dict:
    settings = data.get_profile_settings(user)
    if period == "month": start, end = month_bounds(anchor.year, anchor.month)
    else: period = "week"; start, end = week_bounds(anchor)
    checkins = data.get_checkins(user, start, end)
    index = build_day_index(checkins, start, end)
    habit_lookup = data.build_habit_lookup(user, start, end)
    habit_defs = data.get_habit_defs(user)
    raw = orchestrator.build_overview(period=period, start=start, end=end, index=index, settings=settings, habit_lookup=habit_lookup, goals=data.get_goals(user))
    score_points = raw["series"]
    raw["learning_score_trend"] = {**raw["learning_score_trend"], "points": [{"date": item["date"], "reported": item["reported"], "value": item["score"]} for item in score_points], "average": raw["average_learning_score"]}
    study_points = []
    mood_points = []
    focus_counts = Counter()
    for day in sorted(index):
        record = index[day]
        focus_value = FOCUS_SCORES.get(record.focus_level)
        mood_value = MOOD_SCORES.get(record.mood)
        if record.reported and record.focus_level in FOCUS_SCORES: focus_counts[record.focus_level] += 1
        study_points.append({"date": day.isoformat(), "reported": record.reported, "hours": record.study_hours if record.reported else None, "focus": round(focus_value*100,1) if focus_value is not None else None})
        mood_points.append({"date": day.isoformat(), "reported": record.reported, "value": mood_value})
    raw["study_trend"] = {"points": study_points}
    raw["mood_trend"] = {"points": mood_points}
    raw["focus_distribution"] = {"buckets": [{"key": key, "label": key.replace("_", " ").title(), "count": focus_counts.get(key,0)} for key in FOCUS_SCORES], "average": round(sum(FOCUS_SCORES[key]*count for key,count in focus_counts.items())/sum(focus_counts.values())*100,1) if focus_counts else None}
    raw["habit_summary"] = {"items": _habit_summary(habit_defs, habit_lookup, start, end)}
    raw["distractions"]["items"] = [{"key": key, "label": key.replace("_", " ").title(), "count": count} for key,count in raw["distractions"]["by_type"].items()]
    raw["coverage"] = {**raw["coverage"], "reported_days": raw["coverage"]["reported"], "total_days": raw["coverage"]["total"], "missing_days": raw["coverage"]["total"]-raw["coverage"]["reported"]}
    reported = [item for item in index.values() if item.reported]
    raw["summary"] = {"total_study_hours": raw["study_hours_total"], "average_study_hours": round(raw["study_hours_total"]/len(reported),1) if reported else None, "study_days": sum(1 for item in reported if (item.study_hours or 0)>0), "most_productive_day": max(reported,key=lambda item:item.study_hours or 0).date.isoformat() if reported else None, "coverage_pct": round(raw["coverage"]["ratio"]*100,1)}
    if period == "month":
        previous_anchor = start - dt.timedelta(days=1); prior_start, prior_end = month_bounds(previous_anchor.year, previous_anchor.month)
    else:
        prior_end = start - dt.timedelta(days=1); prior_start = prior_end - dt.timedelta(days=6)
    current = _period_snapshot(user,start,end,settings); prior = _period_snapshot(user,prior_start,prior_end,settings)
    raw["comparison"] = {key: _safe_growth(current[key],prior[key]) for key in current}
    return raw


def assemble_calendar(user, year: int, month: int) -> dict:
    settings = data.get_profile_settings(user); start,end=month_bounds(year,month)
    index=build_day_index(data.get_checkins(user,start,end),start,end); lookup=data.build_habit_lookup(user,start,end); today=data.local_today(user)
    raw=orchestrator.build_calendar(year=year,month=month,start=start,end=end,index=index,settings=settings,habit_lookup=lookup,today=today)
    for item in raw["days"]:
        day=dt.date.fromisoformat(item["date"]); planned=day.isoweekday() in set(settings["study_weekdays"]); item["is_planned_day"]=planned; item["learning_score"]=item.get("score")
        if item["status"]=="not_reported" and not planned: item["status"]="not_planned"
    return raw


def generate_reflection(user, day: dt.date, *, force: bool = False) -> AIReflection:
    dashboard = assemble_dashboard(user, day)
    summary = build_summary(dashboard)
    base_digest = summary_hash(summary)
    namespace = provider.legacy_cache_namespace()
    digest = hashlib.sha256(f"{base_digest}:{namespace}".encode()).hexdigest()
    if not force:
        cached = AIReflection.objects.filter(
            user=user, date=day, version=ANALYTICS_VERSION, summary_hash=digest
        ).first()
        if cached is not None:
            return cached
    text, source, model_name = generate_reflection_text(summary)
    snapshot = provider.disclosure_snapshot() if source == AIReflection.Source.LLM else {}
    reflection, _ = AIReflection.objects.update_or_create(
        user=user, date=day, version=ANALYTICS_VERSION, summary_hash=digest,
        defaults={
            "content": text, "source": source, "model_name": model_name,
            "provider_disclosure": snapshot,
        },
    )
    return reflection
