# """Provider-neutral, OpenAI-compatible strict-JSON adapter.

# Configured entirely by environment/settings so any OpenAI-compatible endpoint
# works. Distinct from the legacy reflection adapter (analytics.services.llm):
# this one requests a strict JSON object, enforces a short (default 3s) timeout,
# and validates the response locally against the service contract.

# Safety properties:
# * Requires complete provider identity/privacy/retention disclosure.
# * Requires HTTPS for the provider base URL whenever ``DEBUG`` is off.
# * Provider redirects are rejected to prevent HTTPS downgrade or credential forwarding.
# * Native JSON object mode is configurable (``AI_JSON_MODE``).
# * Rejects duplicate JSON keys in the provider response.
# * Enforces exact-key / per-string / total-output-size limits via the contract
#   validator.
# * Never logs the raw provider response body.
# * Any failure -- misconfiguration, non-HTTPS in production, network error,
#   timeout, non-JSON, duplicate keys, or schema mismatch -- makes
#   :func:`generate_structured` return ``None`` so the caller uses a deterministic
#   fallback. It never raises and never blocks longer than the timeout.
# """
# from __future__ import annotations

# import json
# import urllib.error
# import urllib.request

# from django.conf import settings

# from .contracts import ServiceContract, validate_payload
# from . import provider, transport


# class _DuplicateKeyError(ValueError):
#     """Raised when a JSON object contains duplicate keys."""


# def _reject_duplicate_keys(pairs):
#     seen: dict = {}
#     for key, value in pairs:
#         if key in seen:
#             raise _DuplicateKeyError(f"duplicate key: {key}")
#         seen[key] = value
#     return seen


# def _config() -> dict:
#     base = (getattr(settings, "LLM_API_BASE_URL", "") or "").rstrip("/")
#     model = (
#         getattr(settings, "AI_INSIGHT_MODEL", "")
#         or getattr(settings, "LLM_MODEL", "")
#         or "gpt-4o-mini"
#     )
#     return {
#         "base_url": base,
#         "api_key": getattr(settings, "LLM_API_KEY", "") or "",
#         "model": model,
#         "timeout": float(getattr(settings, "AI_INSIGHT_TIMEOUT_SECONDS", 3) or 3),
#         "json_mode": bool(getattr(settings, "AI_JSON_MODE", True)),
#     }


# def is_configured() -> bool:
#     cfg = _config()
#     if not (cfg["base_url"] and cfg["api_key"]):
#         return False
#     if not provider.disclosure_complete():
#         return False
#     # In production the provider endpoint must be reached over HTTPS.
#     if not settings.DEBUG and not cfg["base_url"].lower().startswith("https://"):
#         return False
#     return True


# def _call(contract: ServiceContract, context: dict, cfg: dict) -> str:
#     user_content = (
#         f"Return a single JSON object with this exact schema: {contract.schema_hint}. "
#         f"Context ({contract.context_label}):\n"
#         f"{json.dumps(context, sort_keys=True, separators=(',', ':'))}"
#     )
#     payload = {
#         "model": cfg["model"],
#         "messages": [
#             {"role": "system", "content": contract.system_prompt},
#             {"role": "user", "content": user_content},
#         ],
#         "temperature": 0.4,
#         "max_tokens": 400,
#     }
#     if cfg["json_mode"]:
#         payload["response_format"] = {"type": "json_object"}
#     req = urllib.request.Request(
#         f"{cfg['base_url']}/chat/completions",
#         data=json.dumps(payload).encode("utf-8"),
#         headers={
#             "Content-Type": "application/json",
#             "Authorization": f"Bearer {cfg['api_key']}",
#         },
#         method="POST",
#     )
#     max_bytes = int(getattr(settings, "AI_MAX_RESPONSE_BYTES", 65536))
#     with transport.open_no_redirect(req, timeout=cfg["timeout"]) as resp:
#         raw = resp.read(max_bytes + 1)
#     if len(raw) > max_bytes:
#         raise ValueError("provider response exceeded AI_MAX_RESPONSE_BYTES")
#     data = json.loads(raw.decode("utf-8"))
#     return data["choices"][0]["message"]["content"] or ""


# def generate_structured(contract: ServiceContract, context: dict) -> tuple[dict | None, str]:
#     """Return ``(validated_payload_or_None, model_name)``. Never raises.

#     Deliberately does not log the raw provider body; only structured, validated
#     output ever leaves this function.
#     """
#     cfg = _config()
#     if not is_configured():
#         return None, ""
#     try:
#         raw = _call(contract, context, cfg)
#         parsed = json.loads(raw, object_pairs_hook=_reject_duplicate_keys)
#     except (
#         urllib.error.URLError,
#         TimeoutError,
#         OSError,
#         ValueError,
#         KeyError,
#         TypeError,
#     ):
#         return None, ""
#     validated = validate_payload(contract, parsed)
#     if validated is None:
#         return None, ""
#     return validated, cfg["model"]


"""
Provider-neutral OpenAI-compatible structured JSON LLM adapter.

Configured through Django settings.

Required settings:

    LLM_API_BASE_URL
    LLM_API_KEY
    AI_INSIGHT_MODEL
    AI_INSIGHT_TIMEOUT_SECONDS
    AI_JSON_MODE
    AI_MAX_RESPONSE_BYTES

Returns validated structured JSON.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from django.conf import settings

from . import provider, transport
from .contracts import ServiceContract, validate_payload


class _DuplicateKeyError(ValueError):
    pass


def _reject_duplicate_keys(pairs):
    seen = {}

    for key, value in pairs:
        if key in seen:
            raise _DuplicateKeyError(f"duplicate key: {key}")

        seen[key] = value

    return seen


def _config() -> dict:
    return {
        "base_url": (getattr(settings, "LLM_API_BASE_URL", "") or "").rstrip("/"),
        "api_key": getattr(settings, "LLM_API_KEY", "") or "",
        "model": getattr(settings, "AI_INSIGHT_MODEL", "") or "gpt-4o-mini",
        "timeout": float(
            getattr(settings, "AI_INSIGHT_TIMEOUT_SECONDS", 20) or 20
        ),
        "json_mode": bool(getattr(settings, "AI_JSON_MODE", True)),
        "max_response_bytes": int(
            getattr(settings, "AI_MAX_RESPONSE_BYTES", 65536)
        ),
    }


def is_configured() -> bool:
    cfg = _config()

    if not (
        cfg["base_url"]
        and cfg["api_key"]
        and provider.disclosure_complete()
    ):
        return False

    if (
        not settings.DEBUG
        and not cfg["base_url"].lower().startswith("https://")
    ):
        return False

    return True


def _call_openai_compatible(
    contract: ServiceContract,
    context: dict,
) -> str:

    cfg = _config()

    user_content = (
        f"Return a single JSON object with this exact schema: "
        f"{contract.schema_hint}. "
        f"Context ({contract.context_label}):\n"
        f"{json.dumps(context)}"
    )

    payload = {
        "model": cfg["model"],
        "messages": [
            {
                "role": "system",
                "content": contract.system_prompt,
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
        "temperature": 0.4,
    }

    if cfg["json_mode"]:
        payload["response_format"] = {
            "type": "json_object"
        }

    req = urllib.request.Request(
        f"{cfg['base_url']}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg['api_key']}",
            "User-Agent": (
                "Mozilla/5.0 "
                "(Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36"
            ),
        },
        method="POST",
    )

    with transport.open_no_redirect(
        req,
        timeout=cfg["timeout"],
    ) as resp:

        raw = resp.read(cfg["max_response_bytes"] + 1)

    if len(raw) > cfg["max_response_bytes"]:
        raise ValueError("Response too large")

    data = json.loads(raw.decode("utf-8"))

    return data["choices"][0]["message"]["content"] or ""


def generate_structured(
    contract: ServiceContract,
    context: dict,
) -> tuple[dict | None, str]:
    """
    Returns:

        (validated_json, model_name)

    Returns:

        (None, "")
    on any failure.
    """

    print("Inside adapter.py")
    cfg = _config()

    if not is_configured():
        return None, ""

    try:
        raw = _call_openai_compatible(
            contract,
            context,
        )

        parsed = json.loads(
            raw,
            object_pairs_hook=_reject_duplicate_keys,
        )

        validated = validate_payload(
            contract,
            parsed,
        )

        return validated, cfg["model"]

    except (
        urllib.error.URLError,
        ValueError,
        KeyError,
        TimeoutError,
        OSError,
        json.JSONDecodeError,
        _DuplicateKeyError,
    ):
        return None, ""