"""Additive AI insight layer.

Separate from the legacy AIReflection stack (which stays untouched). Provides:
- strict per-service contracts (:mod:`contracts`)
- deterministic evidence + eligibility (:mod:`evidence`)
- privacy-safe behavior context builders (:mod:`context`)
- a provider-neutral OpenAI-compatible strict-JSON adapter (:mod:`adapter`)
- deterministic fallbacks (:mod:`fallbacks`)
- a cache-first generation orchestrator (:mod:`orchestrator`)
"""
