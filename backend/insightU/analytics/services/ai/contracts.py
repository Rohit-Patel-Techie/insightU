"""Strict service contracts for AI insight generation.

Each service declares the exact JSON shape the provider must return. The adapter
validates provider output locally against these contracts; any deviation is
rejected and a deterministic fallback is used instead. This keeps output shapes
stable and provider-neutral.
"""
from __future__ import annotations

import json

from dataclasses import dataclass, field
from typing import Callable

# Service identifiers (kept in sync with analytics.models.AIServiceChoices).
DAILY_COACH = "daily_coach"
SCORE_EXPLANATION = "score_explanation"
GOAL_COACH = "goal_coach"
PATTERN_DISCOVERY = "pattern_discovery"
WEEKLY_COACH = "weekly_coach"
JOURNAL_AI = "journal_ai"

SERVICES = (
    DAILY_COACH,
    SCORE_EXPLANATION,
    GOAL_COACH,
    PATTERN_DISCOVERY,
    WEEKLY_COACH,
    JOURNAL_AI,
)

# Shared safety rules injected into every system prompt.
SAFETY_RULES = (
    "Rules: never diagnose or imply any medical/psychological condition; never "
    "claim causation; do not invent facts not present in the provided context; "
    "do not output any specific numbers, scores, counts, or statistics -- all "
    "figures are owned and displayed by the app, so refer to them only "
    "qualitatively; never infer or state the student's best or strongest study "
    "time of day; do not mention that you are an AI or reference the "
    "context/JSON. Return ONLY a single JSON object that matches the requested "
    "schema."
)


@dataclass(frozen=True)
class FieldSpec:
    """One field in a service response schema."""

    name: str
    kind: str  # "string" or "string_list"
    required: bool = True
    max_items: int | None = None  # only for string_list
    min_items: int = 0


@dataclass(frozen=True)
class ServiceContract:
    name: str
    system_prompt: str
    fields: tuple[FieldSpec, ...]
    # Human-readable schema description embedded in the user message.
    schema_hint: str
    # Describes the nature of the context for the user message. Journal content
    # is the student's own raw text -- never described as anonymized/aggregated.
    context_label: str


def _fields_for(name: str, pattern_max: int, weekly_max: int) -> tuple[FieldSpec, ...]:
    return {
        DAILY_COACH: (
            FieldSpec("win", "string"),
            FieldSpec("focus_area", "string"),
            FieldSpec("tomorrow_action", "string"),
            FieldSpec("supportive_note", "string"),
        ),
        SCORE_EXPLANATION: (
            FieldSpec("main_factor", "string"),
            FieldSpec("explanation", "string"),
            FieldSpec("best_next_step", "string"),
        ),
        GOAL_COACH: (
            FieldSpec("evidence_summary", "string"),
            FieldSpec("current_focus", "string"),
            FieldSpec("next_action", "string"),
        ),
        PATTERN_DISCOVERY: (
            FieldSpec("headline", "string"),
            FieldSpec("patterns", "string_list", max_items=pattern_max, min_items=1),
            FieldSpec("next_action", "string"),
        ),
        WEEKLY_COACH: (
            FieldSpec("biggest_win", "string"),
            FieldSpec("challenge", "string"),
            FieldSpec("next_week_focus", "string"),
        ),
        JOURNAL_AI: (
            FieldSpec("theme", "string"),
            FieldSpec("expressed_tone", "string"),
            FieldSpec("reflection", "string"),
            FieldSpec("action", "string"),
        ),
    }[name]


_SYSTEM = {
    DAILY_COACH: (
        "You are a supportive study-habits coach. You receive an anonymized JSON "
        "summary of one student's self-reported metrics for a single day. Write a "
        "short, warm, specific daily coaching note and concrete suggestions."
    ),
    SCORE_EXPLANATION: (
        "You are a transparent study-analytics explainer. You receive an anonymized "
        "JSON summary of how a student's Learning Score for one day was composed. "
        "Explain plainly what drove the score using only the provided components."
    ),
    GOAL_COACH: (
        "You are a supportive goal coach. You receive an anonymized JSON summary of "
        "one active study goal and its recent alignment signals. Encourage progress "
        "and suggest concrete next steps grounded only in the provided signals."
    ),
    PATTERN_DISCOVERY: (
        "You are a careful behavioral-pattern observer. You receive an anonymized "
        "JSON summary aggregated over a rolling recent window of a student's "
        "self-reported study metrics. Surface neutral, supportive observed patterns."
    ),
    WEEKLY_COACH: (
        "You are a supportive weekly study coach. You receive an anonymized JSON "
        "summary of the current week's self-reported metrics so far. Give an "
        "encouraging summary and a few focus areas for the rest of the week."
    ),
    JOURNAL_AI: (
        "You are a supportive journaling companion. You receive ONLY the text of a "
        "single journal entry the student explicitly chose to share. Offer a brief, "
        "warm reflection and a few gentle follow-up prompts."
    ),
}

_SCHEMA_HINT = {
    DAILY_COACH: '{"win": string, "focus_area": string, "tomorrow_action": string, "supportive_note": string}',
    SCORE_EXPLANATION: '{"main_factor": string, "explanation": string, "best_next_step": string}',
    GOAL_COACH: '{"evidence_summary": string, "current_focus": string, "next_action": string}',
    PATTERN_DISCOVERY: '{"headline": string, "patterns": [string, ...], "next_action": string}',
    WEEKLY_COACH: '{"biggest_win": string, "challenge": string, "next_week_focus": string}',
    JOURNAL_AI: '{"theme": string, "expressed_tone": string, "reflection": string, "action": string}',
}


_CONTEXT_LABEL = {
    DAILY_COACH: "anonymized, aggregated summary data",
    SCORE_EXPLANATION: "anonymized, aggregated summary data",
    GOAL_COACH: "anonymized, aggregated summary data",
    PATTERN_DISCOVERY: "anonymized, aggregated summary data",
    WEEKLY_COACH: "anonymized, aggregated summary data",
    JOURNAL_AI: "the student's own journal entry text",
}


def get_contract(name: str, *, pattern_max: int = 7, weekly_max: int = 3) -> ServiceContract:
    if name not in SERVICES:
        raise KeyError(f"Unknown AI service: {name!r}")
    system = f"{_SYSTEM[name]} {SAFETY_RULES}"
    return ServiceContract(
        name=name,
        system_prompt=system,
        fields=_fields_for(name, pattern_max, weekly_max),
        schema_hint=_SCHEMA_HINT[name],
        context_label=_CONTEXT_LABEL[name],
    )


def validate_payload(contract: ServiceContract, obj) -> dict | None:
    """Validate provider output locally against ``contract``.

    Strict guards (any violation rejects the whole payload -> deterministic
    fallback, never a partial/truncated result):

    * must be a JSON object
    * exact keys only: no keys outside the contract's declared fields
    * required fields present and correctly typed
    * per-string length limit (``AI_MAX_STRING_CHARS``) enforced by rejection
    * total serialized output-size limit (``AI_MAX_OUTPUT_BYTES``)

    Returns a cleaned dict (strings stripped, lists filtered to non-empty
    strings and trimmed to ``max_items``), or ``None`` if invalid.
    """
    from django.conf import settings

    if not isinstance(obj, dict):
        return None
    allowed = {spec.name for spec in contract.fields}
    # Exact-key rejection: any unexpected top-level key invalidates the payload.
    if set(obj.keys()) - allowed:
        return None

    max_chars = int(getattr(settings, "AI_MAX_STRING_CHARS", 2000))
    max_bytes = int(getattr(settings, "AI_MAX_OUTPUT_BYTES", 16384))

    cleaned: dict = {}
    for spec in contract.fields:
        value = obj.get(spec.name)
        if spec.kind == "string":
            if not isinstance(value, str) or not value.strip():
                if spec.required:
                    return None
                continue
            text = value.strip()
            if len(text) > max_chars:
                return None
            cleaned[spec.name] = text
        elif spec.kind == "string_list":
            if not isinstance(value, list):
                if spec.required:
                    return None
                continue
            items = []
            for v in value:
                if not isinstance(v, str):
                    continue
                t = v.strip()
                if not t:
                    continue
                if len(t) > max_chars:
                    return None
                items.append(t)
            if spec.max_items is not None:
                items = items[: spec.max_items]
            if len(items) < spec.min_items:
                return None
            cleaned[spec.name] = items
    if not cleaned:
        return None
    if len(json.dumps(cleaned, separators=(",", ":")).encode("utf-8")) > max_bytes:
        return None
    return cleaned
