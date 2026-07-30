from django.conf import settings
from django.db import models

from .services.constants import ANALYTICS_VERSION


class AIReflection(models.Model):
    """A cached AI (or deterministic fallback) reflection for a user + date.

    Cached by (user, date, version, summary_hash): if the underlying analytics
    summary is unchanged we serve the stored text instead of re-calling the LLM.
    Only the compact summary (never raw/journal data) is ever sent upstream.
    """

    class Source(models.TextChoices):
        LLM = "llm", "LLM"
        FALLBACK = "fallback", "Deterministic fallback"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_reflections",
    )
    date = models.DateField()
    version = models.CharField(max_length=20, default=ANALYTICS_VERSION)
    summary_hash = models.CharField(max_length=64)
    content = models.TextField()
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.FALLBACK
    )
    model_name = models.CharField(max_length=100, blank=True, default="")
    provider_disclosure = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "date", "version", "summary_hash"],
                name="unique_user_date_version_summaryhash",
            )
        ]
        indexes = [
            models.Index(fields=["user", "date"], name="analytics_a_user_id_date_idx"),
        ]

    def __str__(self):
        return f"AIReflection({self.user_id}, {self.date}, {self.source})"


class AIServiceChoices(models.TextChoices):
    """Strict set of AI insight services (single source of truth for the app)."""

    DAILY_COACH = "daily_coach", "Daily coach"
    SCORE_EXPLANATION = "score_explanation", "Score explanation"
    GOAL_COACH = "goal_coach", "Goal coach"
    PATTERN_DISCOVERY = "pattern_discovery", "Pattern discovery"
    WEEKLY_COACH = "weekly_coach", "Weekly coach"
    JOURNAL_AI = "journal_ai", "Journal AI"


class AIInsight(models.Model):
    """Cached, structured AI (or deterministic fallback) insight.

    Additive to :class:`AIReflection` (the legacy reflection endpoints are
    untouched). Cached by (user, service, version, scope_key, evidence_hash):
    identical deterministic evidence reuses the stored structured content
    instead of re-calling the provider. Only privacy-safe context derived from
    the deterministic evidence is ever sent upstream.
    """

    class Source(models.TextChoices):
        LLM = "llm", "LLM"
        FALLBACK = "fallback", "Deterministic fallback"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_insights",
    )
    service = models.CharField(max_length=32, choices=AIServiceChoices.choices)
    version = models.CharField(max_length=20, default=ANALYTICS_VERSION)
    # Deterministic scope identifier within a service (e.g. a date, week start,
    # goal id, or journal entry id). Portable across SQLite/PostgreSQL.
    scope_key = models.CharField(max_length=100)
    evidence_hash = models.CharField(max_length=64)
    content = models.JSONField(default=dict)
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.FALLBACK
    )
    model_name = models.CharField(max_length=100, blank=True, default="")
    # Immutable provider attribution captured when an external result is stored.
    provider_disclosure = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "service", "version", "scope_key", "evidence_hash"],
                name="unique_user_service_version_scope_evidence",
            )
        ]
        indexes = [
            models.Index(
                fields=["user", "service", "scope_key"],
                name="ai_insight_user_svc_scope_idx",
            ),
        ]

    def __str__(self):
        return f"AIInsight({self.user_id}, {self.service}, {self.scope_key}, {self.source})"


class AIGenerationAttempt(models.Model):
    """Metadata-only record of an AI generation attempt.

    Deliberately stores NO prompt, context, evidence, or generated content --
    only observability/rate-limiting metadata. Used to enforce the force
    regeneration limit (max 3 per user/service/hour).
    """

    class Status(models.TextChoices):
        CACHE_HIT = "cache_hit", "Cache hit"
        GENERATED = "generated", "Generated"
        FALLBACK = "fallback", "Deterministic fallback"
        INELIGIBLE = "ineligible", "Ineligible"
        THROTTLED = "throttled", "Throttled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_generation_attempts",
    )
    service = models.CharField(max_length=32, choices=AIServiceChoices.choices)
    scope_key = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices)
    source = models.CharField(max_length=20, blank=True, default="")
    forced = models.BooleanField(default=False)
    duration_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "service", "created_at"],
                name="ai_attempt_user_svc_time_idx",
            ),
        ]

    def __str__(self):
        return f"AIGenerationAttempt({self.user_id}, {self.service}, {self.status})"