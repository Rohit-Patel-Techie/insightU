"""Cache-first AI insight generation orchestrator.

Flow per request:
  1. Build deterministic evidence + eligibility for the service (anchored to a
     caller-supplied local date, defaulting to the user's local today).
  2. If ineligible -> record a metadata-only attempt and return an ineligible
     envelope carrying deterministic progress/coverage evidence (no provider
     call).
  3. If not forced and a cached insight exists for the exact
     (user, service, version, scope_key, evidence_hash) -> return it.
  4. If forced, enforce the per-user/service/hour force limit.
  5. Build privacy-safe context, call the strict-JSON adapter (short timeout,
     local validation). On any failure use the deterministic fallback.
  6. Persist the structured insight (cache) + a metadata-only attempt.

Always returns a common envelope dict (see :mod:`envelope`).
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import time

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from ..constants import ANALYTICS_VERSION
from . import (
    adapter,
    context as context_mod,
    evidence as evidence_mod,
    fallbacks,
    provider,
)
from .envelope import build_envelope
from .contracts import (
    DAILY_COACH,
    GOAL_COACH,
    JOURNAL_AI,
    PATTERN_DISCOVERY,
    SCORE_EXPLANATION,
    WEEKLY_COACH,
    get_contract,
)

# Result statuses (mirror AIGenerationAttempt.Status values).
CACHE_HIT = "cache_hit"
GENERATED = "generated"
FALLBACK = "fallback"
INELIGIBLE = "ineligible"
THROTTLED = "throttled"

_SERVICES = {
    DAILY_COACH, SCORE_EXPLANATION, GOAL_COACH,
    PATTERN_DISCOVERY, WEEKLY_COACH, JOURNAL_AI,
}


def _build_evidence(user, service, *, anchor, entry):
    if service == DAILY_COACH:
        return evidence_mod.daily_coach(user, anchor)
    if service == SCORE_EXPLANATION:
        return evidence_mod.score_explanation(user, anchor)
    if service == GOAL_COACH:
        return evidence_mod.goal_coach(user, anchor)
    if service == PATTERN_DISCOVERY:
        return evidence_mod.pattern_discovery(user, anchor)
    if service == WEEKLY_COACH:
        return evidence_mod.weekly_coach(user, anchor)
    if service == JOURNAL_AI:
        return evidence_mod.journal_ai(user, entry)
    raise KeyError(f"Unknown AI service: {service!r}")


def _caps():
    return (int(settings.AI_PATTERN_MAX_ITEMS), int(settings.AI_WEEKLY_MAX_ITEMS))


def _cache_evidence_hash(base_hash: str) -> str:
    raw = f"{base_hash}:{provider.cache_namespace()}".encode()
    return hashlib.sha256(raw).hexdigest()


def _record_attempt(user, service, scope_key, status, *, source="", forced=False, duration_ms=0):
    from ...models import AIGenerationAttempt

    AIGenerationAttempt.objects.create(
        user=user, service=service, scope_key=scope_key or "", status=status,
        source=source, forced=forced, duration_ms=int(duration_ms),
    )


def _force_count(user, service) -> int:
    from ...models import AIGenerationAttempt

    since = timezone.now() - _dt.timedelta(hours=1)
    return AIGenerationAttempt.objects.filter(
        user=user, service=service, forced=True,
        status__in=(GENERATED, FALLBACK), created_at__gte=since,
    ).count()


def delete_derived_journal_insights(user, entry_id=None) -> int:
    """Delete cached journal insights for a user (optionally one entry).

    Used on journal-entry edit/delete (invalidation) and consent revocation.
    """
    from ...models import AIInsight

    qs = AIInsight.objects.filter(user=user, service=JOURNAL_AI)
    if entry_id is not None:
        qs = qs.filter(scope_key=f"entry:{entry_id}")
    deleted, _ = qs.delete()
    return deleted


def generate_insight(user, service, *, anchor=None, entry=None, force=False) -> dict:
    """Generate an insight; Journal AI is serialized with consent and entry writes."""
    if service not in _SERVICES:
        raise KeyError(f"Unknown AI service: {service!r}")
    if service != JOURNAL_AI:
        return _generate_insight(user, service, anchor=anchor, entry=entry, force=force)
    if entry is None or entry.user_id != user.id:
        raise PermissionDenied("Journal entry does not belong to this user.")

    from journal.models import JournalAIConsent, JournalEntry

    with transaction.atomic():
        JournalAIConsent.objects.select_for_update().filter(user=user).first()
        try:
            locked_entry = JournalEntry.objects.select_for_update().get(
                pk=entry.pk, user=user
            )
        except JournalEntry.DoesNotExist as exc:
            raise PermissionDenied("Journal entry does not belong to this user.") from exc
        return _generate_insight(
            user, service, anchor=anchor, entry=locked_entry, force=force
        )


def _generate_insight(user, service, *, anchor=None, entry=None, force=False) -> dict:
    from ...models import AIInsight

    if service not in _SERVICES:
        raise KeyError(f"Unknown AI service: {service!r}")

    if anchor is None and service != JOURNAL_AI:
        from ... import data
        anchor = data.local_today(user)

    ev = _build_evidence(user, service, anchor=anchor, entry=entry)
    scope_key = ev["scope_key"]

    if not ev["eligible"]:
        _record_attempt(user, service, scope_key, INELIGIBLE)
        return build_envelope(service, INELIGIBLE, builder=ev, reason=ev["reason"])

    evidence = ev["evidence"]
    base_evidence_hash = ev.get("evidence_hash") or evidence_mod.evidence_digest(evidence)
    evidence_hash = _cache_evidence_hash(base_evidence_hash)

    if not force:
        cached = AIInsight.objects.filter(
            user=user, service=service, version=ANALYTICS_VERSION,
            scope_key=scope_key, evidence_hash=evidence_hash,
        ).first()
        if cached is not None:
            _record_attempt(user, service, scope_key, CACHE_HIT, source=cached.source)
            return build_envelope(service, CACHE_HIT, insight=cached, builder=ev)
    else:
        limit = int(settings.AI_INSIGHT_FORCE_MAX_PER_HOUR)
        if _force_count(user, service) >= limit:
            _record_attempt(user, service, scope_key, THROTTLED, forced=True)
            return build_envelope(service, THROTTLED, builder=ev,
                                  reason="force_limit_reached", retry_after=3600)

    pattern_max, weekly_max = _caps()
    contract = get_contract(service, pattern_max=pattern_max, weekly_max=weekly_max)
    ctx = context_mod.build_context(service, evidence)

    started = time.monotonic()
    payload, model_name = adapter.generate_structured(contract, ctx)
    duration_ms = (time.monotonic() - started) * 1000

    if payload is not None:
        content, source, status = payload, AIInsight.Source.LLM, GENERATED
    else:
        max_items = pattern_max if service == PATTERN_DISCOVERY else (
            weekly_max if service == WEEKLY_COACH else None
        )
        content = fallbacks.build_fallback(service, evidence, max_items=max_items)
        source, model_name, status = AIInsight.Source.FALLBACK, "", FALLBACK

    if service == JOURNAL_AI:
        from journal import consent_service
        if not consent_service.is_currently_enabled(user):
            _record_attempt(user, service, scope_key, INELIGIBLE)
            return build_envelope(
                service, INELIGIBLE, builder=ev,
                reason="consent_changed_during_generation",
            )

    provider_disclosure = provider.disclosure_snapshot() if source == AIInsight.Source.LLM else {}
    insight, _created = AIInsight.objects.update_or_create(
        user=user, service=service, version=ANALYTICS_VERSION,
        scope_key=scope_key, evidence_hash=evidence_hash,
        defaults={
            "content": content,
            "source": source,
            "model_name": model_name,
            "provider_disclosure": provider_disclosure,
        },
    )
    _record_attempt(user, service, scope_key, status, source=source,
                    forced=force, duration_ms=duration_ms)
    return build_envelope(service, status, insight=insight, builder=ev)
