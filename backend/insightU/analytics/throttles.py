"""Throttles for analytics endpoints.

Rates are declared inline so throttling works without editing the shared
settings module. The AI-reflection generation endpoint is the sensitive one
(it can trigger an outbound LLM call), so it gets a conservative per-user rate.
"""
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class ReflectionGenerateThrottle(SimpleRateThrottle):
    scope = "analytics_reflection_generate"
    rate = "20/hour"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": request.user.pk,
        }


class AnalyticsReadThrottle(UserRateThrottle):
    scope = "analytics_read"
    rate = "240/hour"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": request.user.pk,
        }


class InsightGenerateThrottle(UserRateThrottle):
    """Per-user rate for AI insight generation (rate from DEFAULT_THROTTLE_RATES)."""

    scope = "ai_insight_generate"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}


class InsightReadThrottle(UserRateThrottle):
    """Per-user rate for reading AI insights."""

    scope = "ai_insight_read"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}
