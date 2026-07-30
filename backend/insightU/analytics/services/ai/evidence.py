"""Deterministic evidence + eligibility for each AI insight service.

All evidence is derived ONLY from existing deterministic analytics (reusing the
same orchestrator/summary builders). Nothing new is calculated about behavior.
Evidence is privacy-safe: aggregated/derived numbers and deterministic
theme/category labels. ``journal_ai`` is the sole exception and operates on ONLY
the single journal entry the user explicitly selected.

Every builder returns a normalized dict::

    {
      "eligible": bool,
      "reason": str,
      "scope_key": str,
      "period": dict,            # what window/day/entry the insight covers
      "coverage": dict | None,   # deterministic progress (reported/total/required)
      "confidence": str | None,
      "evidence": dict,          # internal evidence used to build provider context
      "public_evidence": dict,   # evidence safe to echo back in the API envelope
      "evidence_hash": str | None,  # optional precomputed cache fingerprint
    }
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import hmac
import json

from django.conf import settings

from .. import goals as goals_svc
from ..normalization import build_day_index
from ..summary import build_summary

_PRIORITY_RANK = {"high": 0, "medium": 1, "low": 2}


def evidence_digest(evidence: dict) -> str:
    canonical = json.dumps(evidence, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _journal_fingerprint(content: str) -> str:
    """Keyed HMAC-SHA256 fingerprint of raw journal content.

    Used instead of a bare hash so the stored cache key is not a plain,
    dictionary-attackable digest of the user's private prose.
    """
    key = (getattr(settings, "AI_JOURNAL_HMAC_KEY", "") or settings.SECRET_KEY)
    return hmac.new(key.encode("utf-8"), (content or "").encode("utf-8"), hashlib.sha256).hexdigest()


def _ratio_confidence(ratio):
    if ratio is None:
        return None
    if ratio >= 0.75:
        return "high"
    if ratio >= 0.4:
        return "medium"
    return "low"


def _result(*, eligible, reason, scope_key, period, coverage=None,
            confidence=None, evidence=None, public_evidence=None,
            evidence_hash=None):
    evidence = evidence or {}
    return {
        "eligible": eligible,
        "reason": reason,
        "scope_key": scope_key,
        "period": period,
        "coverage": coverage,
        "confidence": confidence,
        "evidence": evidence,
        "public_evidence": public_evidence if public_evidence is not None else evidence,
        "evidence_hash": evidence_hash,
    }


def _window_evidence(user, start: _dt.date, end: _dt.date):
    """Compact privacy-safe aggregates over [start, end] (reuses build_overview)."""
    from .. import orchestrator
    from ... import data

    prof = data.get_profile_settings(user)
    checkins = data.get_checkins(user, start, end)
    index = build_day_index(checkins, start, end)
    habit_lookup = data.build_habit_lookup(user, start, end)
    raw = orchestrator.build_overview(
        period="window", start=start, end=end, index=index,
        settings=prof, habit_lookup=habit_lookup, goals=[],
    )
    reported_points = [
        {"date": pt["date"], "score": pt["score"]}
        for pt in (raw.get("series") or [])
        if pt.get("reported") and pt.get("score") is not None
    ]
    best_day = max(reported_points, key=lambda p: p["score"]) if reported_points else None
    worst_day = min(reported_points, key=lambda p: p["score"]) if reported_points else None
    comp = {
        name: round(item["average"], 3)
        for name, item in (raw.get("component_averages") or {}).items()
    }
    distractions = list((raw.get("distractions", {}).get("by_type", {}) or {}).items())
    distractions.sort(key=lambda kv: (-kv[1], kv[0]))
    themes = raw.get("reflection_themes", {})
    theme_labels = list((themes.get("themes", {}) if isinstance(themes, dict) else {}).keys())
    ev = {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "reported_days": raw["coverage"]["reported"],
        "total_days": raw["coverage"]["total"],
        "coverage_ratio": round(raw["coverage"]["ratio"], 3),
        "average_learning_score": raw.get("average_learning_score"),
        "learning_score_trend": (raw.get("learning_score_trend") or {}).get("direction"),
        "component_averages": comp,
        "top_distractions": [k for k, _ in distractions[:5]],
        "reflection_themes": theme_labels[:5],
        "focus_distribution": raw.get("focus_distribution", {}),
        "mood_distribution": raw.get("mood_distribution", {}),
        "study_hours_total": raw.get("study_hours_total"),
        "best_reported_day": best_day,
        "worst_reported_day": worst_day,
    }
    return ev, index


def _coverage(reported, total, required=None):
    ratio = round(reported / total, 3) if total else 0.0
    cov = {"reported_days": reported, "total_days": total, "coverage_ratio": ratio}
    if required is not None:
        cov["required_reported_days"] = required
    return cov


# --- Per-service builders ---------------------------------------------------

def daily_coach(user, anchor: _dt.date) -> dict:
    from ...api_service import assemble_dashboard

    day = anchor
    scope_key = day.isoformat()
    period = {"kind": "day", "date": day.isoformat()}
    dashboard = assemble_dashboard(user, day)
    if not dashboard.get("reported"):
        return _result(eligible=False, reason="no_check_in_for_day", scope_key=scope_key,
                       period=period, coverage=_coverage(0, 1, 1))
    summary = build_summary(dashboard)
    # Adaptive daily context: only user-owned SAFE signals -- declared study-time
    # preference, canonical challenge labels, and the day's REPORTED distraction
    # timing. No inferred performance-by-time.
    from ... import data as _data
    profile = _data.get_profile(user)
    checkin_summary = dashboard.get("check_in_summary") or {}
    summary["preferred_study_time"] = getattr(profile, "study_time", None) or None
    summary["challenge_labels"] = list(getattr(profile, "challenges", []) or [])
    summary["reported_distraction_time"] = checkin_summary.get("distraction_time") or None
    return _result(
        eligible=True, reason="", scope_key=scope_key, period=period,
        coverage=_coverage(1, 1, 1),
        confidence=summary.get("learning_confidence"),
        evidence=summary,
    )


def score_explanation(user, anchor: _dt.date) -> dict:
    from ...api_service import assemble_dashboard

    day = anchor
    scope_key = day.isoformat()
    period = {"kind": "day", "date": day.isoformat()}
    dashboard = assemble_dashboard(user, day)
    if not dashboard.get("reported"):
        return _result(eligible=False, reason="no_check_in_for_day", scope_key=scope_key,
                       period=period, coverage=_coverage(0, 1, 1))
    summary = build_summary(dashboard)
    if summary.get("learning_score") is None:
        return _result(eligible=False, reason="learning_score_unavailable", scope_key=scope_key,
                       period=period, coverage=_coverage(1, 1, 1))
    evidence = {
        "date": summary.get("date"),
        "learning_score": summary.get("learning_score"),
        "learning_confidence": summary.get("learning_confidence"),
        "components_used": summary.get("components_used"),
        "component_scores": summary.get("component_scores"),
    }
    return _result(eligible=True, reason="", scope_key=scope_key, period=period,
                   coverage=_coverage(1, 1, 1),
                   confidence=summary.get("learning_confidence"), evidence=evidence)

def _select_goal(goals: list[dict]):
    """Highest priority, then nearest due date (nulls last)."""
    def key(g):
        rank = _PRIORITY_RANK.get(g.get("priority"), 1)
        due = g.get("due_date")
        return (rank, 0 if due else 1, due or _dt.date.max)
    return min(goals, key=key)


def goal_coach(user, anchor: _dt.date) -> dict:
    from ... import data

    window = int(settings.AI_PATTERN_WINDOW_DAYS)
    start = anchor - _dt.timedelta(days=window - 1)
    period = {"kind": "rolling", "start": start.isoformat(), "end": anchor.isoformat(), "days": window}

    goals = data.get_goals(user, statuses=("active",))
    if not goals:
        return _result(eligible=False, reason="no_active_goals", scope_key="goal:none",
                       period=period, coverage=None)
    Goal = data._get_model("goals", "Goal")
    if Goal is not None:
        due_map = dict(
            Goal.objects.filter(user=user, status="active").values_list("id", "due_date")
        )
        for g in goals:
            g["due_date"] = due_map.get(g["id"])
    selected = _select_goal(goals)
    scope_key = f"goal:{selected['id']}"

    checkins = data.get_checkins(user, start, anchor)
    index = build_day_index(checkins, start, anchor)
    records = list(index.values())
    reported_days = sum(1 for r in records if r.reported)
    habit_lookup = data.build_habit_lookup(user, start, anchor)
    alignment = goals_svc.goal_alignment(
        selected.get("category"), selected.get("linked_habit_codes", []),
        records, habit_lookup,
    )
    due = selected.get("due_date")
    category_distribution: dict[str, int] = {}
    for r in records:
        if r.reported and r.study_category:
            category_distribution[r.study_category] = category_distribution.get(r.study_category, 0) + 1
    coverage = _coverage(reported_days, len(records))
    evidence = {
        "goal_id": selected["id"],
        "study_category_distribution": category_distribution,
        "title": selected.get("title"),  # local-only; scrubbed from provider context
        "category": selected.get("category"),
        "priority": selected.get("priority"),
        "days_until_due": (due - anchor).days if due else None,
        "linked_habit_count": len(selected.get("linked_habit_codes", [])),
        "alignment_score": alignment.get("score"),
        "alignment_components_used": alignment.get("components_used"),
        "window_days": window,
    }
    return _result(eligible=True, reason="", scope_key=scope_key, period=period,
                   coverage=coverage, confidence=_ratio_confidence(coverage["coverage_ratio"]),
                   evidence=evidence)


def pattern_discovery(user, anchor: _dt.date) -> dict:
    window = int(settings.AI_PATTERN_WINDOW_DAYS)
    required = int(settings.AI_PATTERN_MIN_REPORTED_DAYS)
    start = anchor - _dt.timedelta(days=window - 1)
    scope_key = f"p28:{anchor.isoformat()}"
    period = {"kind": "rolling", "start": start.isoformat(), "end": anchor.isoformat(), "days": window}
    window_ev, _index = _window_evidence(user, start, anchor)
    coverage = _coverage(window_ev["reported_days"], window_ev["total_days"], required)
    if window_ev["reported_days"] < required:
        return _result(eligible=False, reason="insufficient_reported_days",
                       scope_key=scope_key, period=period, coverage=coverage)
    window_ev["max_patterns"] = int(settings.AI_PATTERN_MAX_ITEMS)
    return _result(eligible=True, reason="", scope_key=scope_key, period=period,
                   coverage=coverage, confidence=_ratio_confidence(coverage["coverage_ratio"]),
                   evidence=window_ev)


def weekly_coach(user, anchor: _dt.date) -> dict:
    from ..weekly import week_bounds
    from ... import data

    required = int(settings.AI_WEEKLY_MIN_REPORTED_DAYS)
    today = data.local_today(user)
    monday, sunday = week_bounds(anchor)
    end = min(sunday, today)  # anchored local week, capped at today
    scope_key = f"week:{monday.isoformat()}"
    period = {"kind": "week", "start": monday.isoformat(), "end": end.isoformat()}
    window_ev, _index = _window_evidence(user, monday, end)
    coverage = _coverage(window_ev["reported_days"], window_ev["total_days"], required)
    if window_ev["reported_days"] < required:
        return _result(eligible=False, reason="insufficient_reported_days",
                       scope_key=scope_key, period=period, coverage=coverage)
    window_ev["max_focus_areas"] = int(settings.AI_WEEKLY_MAX_ITEMS)
    return _result(eligible=True, reason="", scope_key=scope_key, period=period,
                   coverage=coverage, confidence=_ratio_confidence(coverage["coverage_ratio"]),
                   evidence=window_ev)


def journal_ai(user, entry) -> dict:
    """Evidence for a single journal entry.

    Provider context will carry ONLY the entry ``content`` (see context.py). The
    envelope echoes a keyed fingerprint + char count -- never title/tags/history.
    Raw content longer than ``AI_JOURNAL_MAX_CONTENT_CHARS`` is rejected outright
    (never truncated) so we never silently send a partial entry.
    """
    from journal import consent_service
    from journal.models import JournalAIConsent

    from django.core.exceptions import PermissionDenied

    if entry is None or entry.user_id != user.id:
        raise PermissionDenied("Journal entry does not belong to this user.")
    scope_key = f"entry:{entry.id}"
    period = {"kind": "entry", "entry_id": entry.id}
    content = entry.content or ""

    if getattr(entry, "ai_opt_out", False):
        return _result(eligible=False, reason="entry_opted_out", scope_key=scope_key, period=period)
    consent = JournalAIConsent.objects.filter(user=user).first()
    if consent is None:
        return _result(eligible=False, reason="consent_not_recorded", scope_key=scope_key, period=period)
    if not consent.enabled or consent.revoked_at is not None:
        return _result(eligible=False, reason="consent_disabled", scope_key=scope_key, period=period)
    if consent_service.needs_decision(consent):
        return _result(eligible=False, reason="consent_outdated", scope_key=scope_key, period=period)
    if not consent_service.disclosure_complete():
        return _result(eligible=False, reason="provider_disclosure_incomplete", scope_key=scope_key, period=period)

    max_chars = int(settings.AI_JOURNAL_MAX_CONTENT_CHARS)
    if len(content) > max_chars:
        return _result(eligible=False, reason="content_too_long", scope_key=scope_key,
                       period=period,
                       public_evidence={"char_count": len(content), "max_chars": max_chars})

    fingerprint = _journal_fingerprint(content)
    # Internal evidence carries content only (used to build provider context).
    internal = {"content": content}
    public = {"fingerprint": fingerprint, "char_count": len(content)}
    return _result(eligible=True, reason="", scope_key=scope_key, period=period,
                   coverage=None, confidence=None,
                   evidence=internal, public_evidence=public,
                   evidence_hash=fingerprint)
