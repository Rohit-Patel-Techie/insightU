"""Provider disclosure and cache-provenance helpers for AI insights."""
from __future__ import annotations

import hashlib
import json
from urllib.parse import urlparse

from django.conf import settings


def disclosure_snapshot() -> dict:
    return {
        "provider_name": (getattr(settings, "AI_PROVIDER_NAME", "") or "").strip() or None,
        "privacy_policy_url": (getattr(settings, "AI_PRIVACY_POLICY_URL", "") or "").strip() or None,
        "data_retention": (getattr(settings, "AI_DATA_RETENTION", "") or "").strip() or None,
        "policy_version": str(getattr(settings, "AI_PROVIDER_POLICY_VERSION", "1")),
    }


def disclosure_complete() -> bool:
    disclosure = disclosure_snapshot()
    parsed = urlparse(disclosure["privacy_policy_url"] or "")
    return bool(
        disclosure["provider_name"]
        and disclosure["data_retention"]
        and parsed.scheme == "https"
        and parsed.netloc
    )


def _cache_namespace(model: str) -> str:
    payload = {
        **disclosure_snapshot(),
        "base_url": (getattr(settings, "LLM_API_BASE_URL", "") or "").rstrip("/"),
        "model": model,
        "configured": bool(
            getattr(settings, "LLM_API_BASE_URL", "")
            and getattr(settings, "LLM_API_KEY", "")
            and disclosure_complete()
        ),
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def cache_namespace() -> str:
    """Fingerprint settings that can change structured insight output."""
    model = (
        getattr(settings, "AI_INSIGHT_MODEL", "")
        or getattr(settings, "LLM_MODEL", "")
        or "gpt-4o-mini"
    )
    return _cache_namespace(model)


def legacy_cache_namespace() -> str:
    """Fingerprint settings that can change legacy reflection output."""
    return _cache_namespace(getattr(settings, "LLM_MODEL", "") or "gpt-4o-mini")
