"""Deterministic, rule-based fallbacks for every AI insight service.

Used when no provider is configured, the call fails/times out, or the response
fails local validation. Purely descriptive and encouraging: no diagnosis, no
causal claims, no fabricated facts, no inference of a best study time, and no
specific numbers (all figures stay server-owned and are rendered by the app).
Every fallback matches its service contract shape EXACTLY.
"""
from __future__ import annotations


def _pretty(name: str) -> str:
    return name.replace("_", " ")


def _highs_lows(cs: dict):
    highs = [k for k, v in (cs or {}).items() if v is not None and v >= 0.8]
    lows = [k for k, v in (cs or {}).items() if v is not None and v <= 0.4]
    return highs, lows


def daily_coach(evidence: dict) -> dict:
    highs, lows = _highs_lows(evidence.get("component_scores", {}))
    win = (
        "You kept up strong " + ", ".join(_pretty(h) for h in highs[:2]) + "."
        if highs else "You showed up and logged your day — that consistency counts."
    )
    focus_area = (
        "Consider giving a little more attention to " + ", ".join(_pretty(l) for l in lows[:2]) + "."
        if lows else "Keep building on the steady routine you already have."
    )
    pref = evidence.get("preferred_study_time")
    tomorrow_action = (
        f"Plan tomorrow's focused study around your preferred {pref} window and log a quick check-in."
        if pref else "Log a quick check-in again tomorrow to keep your momentum going."
    )
    return {
        "win": win,
        "focus_area": focus_area,
        "tomorrow_action": tomorrow_action,
        "supportive_note": "Small, honest steps compound over time — keep it up.",
    }


def score_explanation(evidence: dict) -> dict:
    cs = evidence.get("component_scores", {}) or {}
    rated = {k: v for k, v in cs.items() if v is not None}
    if rated:
        top = max(rated, key=rated.get)
        low = min(rated, key=rated.get)
        main_factor = f"{_pretty(top).capitalize()} was your strongest contribution today."
        best_next_step = f"Focusing on {_pretty(low)} would lift your score the most."
    else:
        main_factor = "No components had data for this day."
        best_next_step = "Log a fuller check-in to see what drives your score."
    explanation = (
        "Your Learning Score is the equal-weight average of the components that "
        "had data today; components without data are left out rather than counted "
        "as zero."
    )
    return {"main_factor": main_factor, "explanation": explanation, "best_next_step": best_next_step}


def goal_coach(evidence: dict) -> dict:
    title = evidence.get("title") or "your goal"
    category = evidence.get("category")
    linked = evidence.get("linked_habit_count") or 0
    align = evidence.get("alignment_score")
    if align is None:
        evidence_summary = (
            f"There isn't enough recent activity yet to gauge alignment for \"{title}\"."
        )
    else:
        band = "strong" if align >= 75 else "steady" if align >= 50 else "early"
        evidence_summary = f"Your recent alignment with \"{title}\" looks {band}."
    current_focus = (
        f"Keep your {_pretty(category)} study sessions pointed at this goal."
        if category else "Keep your study sessions pointed at this goal."
    )
    next_action = (
        "Complete the habits linked to this goal on their scheduled days."
        if linked else "Link a supporting habit to this goal to track progress."
    )
    return {"evidence_summary": evidence_summary, "current_focus": current_focus, "next_action": next_action}


def pattern_discovery(evidence: dict, *, max_items: int = 7) -> dict:
    patterns: list[str] = []
    if evidence.get("learning_score_trend"):
        patterns.append(f"Your Learning Score trend over the window is {_pretty(str(evidence['learning_score_trend']))}.")
    highs, lows = _highs_lows(evidence.get("component_averages", {}))
    if highs:
        patterns.append("Consistent strengths: " + ", ".join(_pretty(h) for h in highs) + ".")
    if lows:
        patterns.append("Areas with room to grow: " + ", ".join(_pretty(w) for w in lows) + ".")
    for d in (evidence.get("top_distractions") or [])[:2]:
        patterns.append(f"A recurring distraction you noted is {_pretty(d)}.")
    for t in (evidence.get("reflection_themes") or [])[:2]:
        patterns.append(f"A recurring reflection theme is {_pretty(t)}.")
    if not patterns:
        patterns.append("Keep logging check-ins so clearer patterns can emerge.")
    return {
        "headline": "Here's what your recent check-ins suggest.",
        "patterns": patterns[:max_items],
        "next_action": "Pick one pattern to act on and keep your check-in streak going.",
    }


def weekly_coach(evidence: dict, *, max_items: int = 3) -> dict:
    highs, lows = _highs_lows(evidence.get("component_averages", {}))
    if evidence.get("best_reported_day"):
        biggest_win = "You had at least one clearly strong day this week — nice work."
    elif highs:
        biggest_win = "You stayed strong on " + ", ".join(_pretty(h) for h in highs[:2]) + "."
    else:
        biggest_win = "You kept checking in this week, which builds the habit."
    if evidence.get("worst_reported_day"):
        challenge = "One day dipped lower than the rest — worth a gentle look at what got in the way."
    elif lows:
        challenge = "Progress was lighter on " + ", ".join(_pretty(w) for w in lows[:2]) + "."
    else:
        challenge = "No major dips stood out this week."
    next_week_focus = (
        "Give extra attention to " + ", ".join(_pretty(w) for w in lows[:2]) + "."
        if lows else "Keep your steady routine going next week."
    )
    return {"biggest_win": biggest_win, "challenge": challenge, "next_week_focus": next_week_focus}


def journal_ai(evidence: dict) -> dict:
    # Content-agnostic (fallback never analyzes the raw entry deeply).
    return {
        "theme": "Personal reflection",
        "expressed_tone": "reflective",
        "reflection": (
            "Thanks for taking time to write. Putting your thoughts into words is a "
            "meaningful step, and revisiting them later can reveal how you're growing."
        ),
        "action": "Note one small, specific thing this entry points you toward next.",
    }


DISPATCH = {
    "daily_coach": daily_coach,
    "score_explanation": score_explanation,
    "goal_coach": goal_coach,
    "pattern_discovery": pattern_discovery,
    "weekly_coach": weekly_coach,
    "journal_ai": journal_ai,
}


def build_fallback(service: str, evidence: dict, *, max_items: int | None = None) -> dict:
    fn = DISPATCH[service]
    if service == "pattern_discovery":
        return fn(evidence, max_items=max_items or 7)
    return fn(evidence)
