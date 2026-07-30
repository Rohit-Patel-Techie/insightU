"""Common AI insight response envelope.

Every generation path (generated, deterministic fallback, cache hit, ineligible,
throttled) and the list serializer return the same stable shape so clients can
consume a single contract::

    service, status, source, model_name, period, coverage, confidence,
    evidence, data, disclosure, generated_at
"""
from __future__ import annotations

from django.utils import timezone

from . import provider as provider_config


def disclosure(*, ai_generated: bool, provider_details=None) -> dict:
    """Provider-neutral disclosure using immutable generation-time attribution."""
    current = provider_config.disclosure_snapshot()
    snapshot = dict(provider_details or {}) if ai_generated else current
    return {
        "ai_generated": bool(ai_generated),
        "provider": snapshot.get("provider_name") if ai_generated else None,
        "privacy_policy_url": snapshot.get("privacy_policy_url"),
        "data_retention": snapshot.get("data_retention"),
        "policy_version": (
            str(snapshot["policy_version"]) if ai_generated and snapshot.get("policy_version")
            else (None if ai_generated else current["policy_version"])
        ),
        "notice": (
            "AI-assisted study coaching. Not medical, psychological, or clinical "
            "advice."
        ),
    }


def build_envelope(service, status, *, insight=None, builder=None,
                   reason="", retry_after=None) -> dict:
    """Assemble the common envelope for a single service result."""
    builder = builder or {}
    source = getattr(insight, "source", "") if insight else ""
    model_name = getattr(insight, "model_name", "") if insight else ""
    data = getattr(insight, "content", None) if insight else None
    generated_at = (
        insight.updated_at.isoformat() if insight is not None else timezone.now().isoformat()
    )

    if status == "ineligible":
        evidence = {"reason": reason}
        if builder.get("coverage"):
            evidence["coverage"] = builder["coverage"]
        # also surface any public progress evidence (e.g. content length)
        if builder.get("public_evidence"):
            evidence.update(builder["public_evidence"])
    elif status == "throttled":
        evidence = {"reason": reason}
        if retry_after is not None:
            evidence["retry_after"] = retry_after
    else:
        evidence = builder.get("public_evidence") or builder.get("evidence") or {}

    return {
        "service": service,
        "status": status,
        "source": source,
        # "model_name": model_name,
        "period": builder.get("period"),
        # "coverage": builder.get("coverage"),
        # "confidence": builder.get("confidence"),
        # "evidence": evidence,
        "data": data,
        # "disclosure": disclosure(
        #     ai_generated=(source == "llm"),
        #     provider_details=getattr(insight, "provider_disclosure", None),
        # ),
        "generated_at": generated_at,
    }
