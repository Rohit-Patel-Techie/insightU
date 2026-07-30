from rest_framework import serializers

from django.conf import settings

from .models import JournalAIConsent, JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50, allow_blank=False, trim_whitespace=True),
        allow_empty=True,
        required=False,
    )
    journal_ai = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = (
            "id", "entry_date", "title", "content", "tags", "ai_opt_out",
            "journal_ai", "created_at", "updated_at",
        )
        read_only_fields = ("id", "journal_ai", "created_at", "updated_at")

    def get_journal_ai(self, obj):
        """Latest Journal AI insight for this entry as an envelope-compatible dict."""
        from analytics.models import AIInsight
        from analytics.serializers import AIInsightSerializer

        insight = (
            AIInsight.objects.filter(
                user_id=obj.user_id, service="journal_ai", scope_key=f"entry:{obj.id}"
            )
            .order_by("-updated_at")
            .first()
        )
        return AIInsightSerializer(insight).data if insight else None

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be blank.")
        return value

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Content cannot be blank.")
        return value

    def validate_tags(self, values):
        normalized = [value.strip() for value in values]
        if len(normalized) != len(set(normalized)):
            raise serializers.ValidationError("Duplicate tags are not allowed.")
        return normalized


class JournalAIConsentSerializer(serializers.ModelSerializer):
    current_version = serializers.SerializerMethodField()
    needs_decision = serializers.SerializerMethodField()

    class Meta:
        model = JournalAIConsent
        fields = (
            "consent_version", "enabled", "decided_at",
            "created_at", "updated_at", "current_version", "needs_decision",
        )
        read_only_fields = fields

    def get_current_version(self, obj):
        return str(settings.JOURNAL_AI_CONSENT_VERSION)

    def get_needs_decision(self, obj):
        return obj.consent_version != str(settings.JOURNAL_AI_CONSENT_VERSION)


class JournalAIConsentInputSerializer(serializers.Serializer):
    enabled = serializers.BooleanField()
