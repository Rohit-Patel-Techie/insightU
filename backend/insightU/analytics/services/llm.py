"""Provider-neutral, OpenAI-compatible LLM adapter with deterministic fallback.

Configured entirely by environment variables so any OpenAI-compatible endpoint
works (OpenAI, Azure, OpenRouter, local vLLM/Ollama, ...):

    LLM_API_BASE_URL   e.g. https://api.openai.com/v1
    LLM_API_KEY        bearer token
    LLM_MODEL          model id
    LLM_TIMEOUT_SECONDS

Only the compact, privacy-safe summary is sent. Provider identity, an HTTPS
privacy-policy URL, and retention terms are required before network access. If the
provider is incomplete, redirects, or any error occurs, a deterministic rule-based reflection is returned instead. The
model is instructed never to diagnose or make clinical/causal claims.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request

from django.conf import settings

from .ai import provider, transport
from .summary import deterministic_fallback

SYSTEM_PROMPT = (
    "You are a supportive study-habits coach for a student productivity app. "
    "You will receive ONLY an aggregated, anonymized JSON summary of a student's "
    "self-reported study metrics for one day. Write a short (2-4 sentence), warm, "
    "specific and actionable reflection. Rules: never diagnose or imply any "
    "medical/psychological condition; never claim causation; do not invent data "
    "not present in the summary; do not mention that you are an AI or reference "
    "the JSON. Be encouraging and concrete."
)

def _config() -> dict:
    return {
        "base_url": (getattr(settings, "LLM_API_BASE_URL", "") or "").rstrip("/"),
        "api_key": getattr(settings, "LLM_API_KEY", "") or "",
        "model": getattr(settings, "LLM_MODEL", "") or "gpt-4o-mini",
        "timeout": float(getattr(settings, "LLM_TIMEOUT_SECONDS", 20) or 20),
    }


def is_configured() -> bool:
    cfg = _config()
    if not (cfg["base_url"] and cfg["api_key"] and provider.disclosure_complete()):
        return False
    if not settings.DEBUG and not cfg["base_url"].lower().startswith("https://"):
        return False
    return True


def _call_openai_compatible(summary: dict) -> str:
    cfg = _config()
    payload = {
        "model": cfg["model"],
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(summary, sort_keys=True)},
        ],
        "temperature": 0.4,
        "max_tokens": 220,
    }
    req = urllib.request.Request(
        f"{cfg['base_url']}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cfg['api_key']}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        method="POST",
    )
    with transport.open_no_redirect(req, timeout=cfg["timeout"]) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    content = data["choices"][0]["message"]["content"]
    return (content or "").strip()


def generate_reflection_text(summary: dict) -> tuple[str, str, str]:
    """Return (text, source, model_name).

    ``source`` is ``llm`` or ``fallback``. Never raises: any failure falls back
    to the deterministic reflection.
    """
    cfg = _config()
    if not is_configured():
        return deterministic_fallback(summary), "fallback", ""
    try:
        text = _call_openai_compatible(summary)
        if not text:
            raise ValueError("Empty LLM response")
        return text, "llm", cfg["model"]
    except (urllib.error.URLError, ValueError, KeyError, TimeoutError, OSError):
        return deterministic_fallback(summary), "fallback", ""
