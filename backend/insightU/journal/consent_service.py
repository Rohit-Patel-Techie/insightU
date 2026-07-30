"""Shared Journal AI consent logic (used by both the journal and analytics APIs).

One-time, versioned consent: the user is asked once per (app consent version,
provider policy version). Revocation disables consent, stamps ``revoked_at``, and
deletes all journal-derived AI insights for the user.
"""
from __future__ import annotations

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from analytics.services.ai import provider as provider_config

from .models import JournalAIConsent


class ProviderDisclosureIncomplete(ValueError):
    """Raised when Journal AI consent lacks required provider disclosures."""


def _current_versions():
    return (
        str(settings.JOURNAL_AI_CONSENT_VERSION),
        str(settings.AI_PROVIDER_POLICY_VERSION),
    )


def needs_decision(consent) -> bool:
    consent_v, policy_v = _current_versions()
    if consent is None:
        return True
    if consent.revoked_at is not None:
        return True
    return consent.consent_version != consent_v or consent.provider_policy_version != policy_v


def get_consent(user):
    return JournalAIConsent.objects.filter(user=user).first()


def set_consent(user, enabled: bool):
    if enabled and not disclosure_complete():
        raise ProviderDisclosureIncomplete(
            "Journal AI cannot be enabled until provider name, HTTPS privacy policy, "
            "and data-retention terms are configured."
        )
    consent_v, policy_v = _current_versions()
    with transaction.atomic():
        JournalAIConsent.objects.select_for_update().filter(user=user).first()
        consent, _ = JournalAIConsent.objects.update_or_create(
            user=user,
            defaults={
                "consent_version": consent_v,
                "provider_policy_version": policy_v,
                "enabled": bool(enabled),
                "decided_at": timezone.now(),
                "revoked_at": None,
            },
        )
    return consent


def revoke_consent(user):
    """Serialize revocation with generation, then delete journal-derived output."""
    from analytics.services.ai.orchestrator import delete_derived_journal_insights

    consent_v, policy_v = _current_versions()
    with transaction.atomic():
        JournalAIConsent.objects.select_for_update().filter(user=user).first()
        consent, _ = JournalAIConsent.objects.update_or_create(
            user=user,
            defaults={
                "consent_version": consent_v,
                "provider_policy_version": policy_v,
                "enabled": False,
                "revoked_at": timezone.now(),
            },
        )
        deleted = delete_derived_journal_insights(user)
    return consent, deleted


def is_currently_enabled(user) -> bool:
    consent = get_consent(user)
    return bool(
        consent
        and consent.enabled
        and consent.revoked_at is None
        and not needs_decision(consent)
        and disclosure_complete()
    )


def _provider_disclosure() -> dict:
    snapshot = provider_config.disclosure_snapshot()
    return {
        "provider_name": snapshot["provider_name"],
        "privacy_policy_url": snapshot["privacy_policy_url"],
        "data_retention": snapshot["data_retention"],
    }


def disclosure_complete() -> bool:
    return provider_config.disclosure_complete()


def state_dict(consent) -> dict:
    """Serializable consent state shared by the journal and analytics endpoints."""
    consent_v, policy_v = _current_versions()
    ready = disclosure_complete()
    if consent is None:
        return {
            "consent_version": None,
            "provider_policy_version": None,
            "enabled": False,
            "decided_at": None,
            "revoked_at": None,
            "current_version": consent_v,
            "current_provider_policy_version": policy_v,
            "needs_decision": True,
            "disclosure_complete": ready,
            "can_enable": ready,
            "disclosure": _provider_disclosure(),
        }
    return {
        "consent_version": consent.consent_version,
        "provider_policy_version": consent.provider_policy_version,
        "enabled": consent.enabled,
        "decided_at": consent.decided_at,
        "revoked_at": consent.revoked_at,
        "current_version": consent_v,
        "current_provider_policy_version": policy_v,
        "needs_decision": needs_decision(consent),
        "disclosure_complete": ready,
        "can_enable": ready,
        "disclosure": _provider_disclosure(),
    }
