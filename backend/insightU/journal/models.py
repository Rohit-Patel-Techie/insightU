from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class JournalEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="journal_entries")
    entry_date = models.DateField()
    title = models.CharField(max_length=200)
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    ai_opt_out = models.BooleanField(
        default=False,
        help_text="Per-entry opt-out from Journal AI insight generation.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-entry_date", "-created_at")
        indexes = (models.Index(fields=("user", "entry_date"), name="journal_user_date_idx"),)

    def clean(self):
        super().clean()
        if not isinstance(self.tags, list):
            raise ValidationError({"tags": "Tags must be a list."})
        if any(not isinstance(tag, str) or not tag.strip() for tag in self.tags):
            raise ValidationError({"tags": "Each tag must be a non-blank string."})
        normalized = [tag.strip() for tag in self.tags]
        if len(normalized) != len(set(normalized)):
            raise ValidationError({"tags": "Duplicate tags are not allowed."})
        if any(len(tag) > 50 for tag in normalized):
            raise ValidationError({"tags": "Tags may contain at most 50 characters."})

    def __str__(self):
        return f"{self.entry_date}: {self.title}"


class JournalAIConsent(models.Model):
    """One-time, versioned consent for Journal AI.

    The user is asked once per consent version. Once a decision is recorded,
    Journal AI is enabled by default (``enabled`` True) unless the user declines
    or later toggles it off; individual entries can still opt out via
    ``JournalEntry.ai_opt_out``. Journal saves never depend on this model.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="journal_ai_consent",
    )
    consent_version = models.CharField(max_length=20)
    # Provider privacy-policy version acknowledged at decision time. A change in
    # either version re-triggers the one-time consent decision.
    provider_policy_version = models.CharField(max_length=20, blank=True, default="")
    enabled = models.BooleanField(default=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    # Set when the user revokes consent; revocation also deletes journal-derived
    # AI insights.
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = (
            models.Index(fields=("user",), name="journal_ai_consent_user_idx"),
        )

    def __str__(self):
        return f"JournalAIConsent({self.user_id}, v{self.consent_version}, enabled={self.enabled})"
