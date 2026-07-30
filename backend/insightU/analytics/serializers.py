from rest_framework import serializers

from .models import AIInsight, AIReflection
from .services.ai.envelope import disclosure as _disclosure


class AIReflectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIReflection
        fields = (
            "id", "date", "version", "content", "source",
            "model_name", "provider_disclosure", "created_at", "updated_at",
        )
        read_only_fields = fields


class GenerateReflectionSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    force = serializers.BooleanField(required=False, default=False)


# Non-journal services are generated via the analytics insight endpoint;
# journal_ai is generated via the journal-entry AI action instead.
INSIGHT_GENERATE_SERVICES = (
    "daily_coach",
    "score_explanation",
    "goal_coach",
    "pattern_discovery",
    "weekly_coach",
)


class AIInsightSerializer(serializers.ModelSerializer):
    """Envelope-compatible representation of a cached insight.

    Mirrors the common generation envelope keys (``service, status, source,
    model_name, period, coverage, confidence, evidence, data, disclosure,
    generated_at``) so clients can consume list and generate responses uniformly.
    Stored rows do not retain period/coverage/confidence/evidence, so those are
    exposed as null/empty for shape compatibility.
    """

    status = serializers.SerializerMethodField()
    data = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    coverage = serializers.SerializerMethodField()
    confidence = serializers.SerializerMethodField()
    evidence = serializers.SerializerMethodField()
    disclosure = serializers.SerializerMethodField()
    generated_at = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AIInsight
        fields = (
            "id", "service", "version", "scope_key", "status", "source",
            "model_name", "period", "coverage", "confidence", "evidence",
            "data", "disclosure", "generated_at", "created_at", "updated_at",
        )
        read_only_fields = fields

    def get_status(self, obj):
        return "cached"

    def get_data(self, obj):
        return obj.content

    def get_period(self, obj):
        return None

    def get_coverage(self, obj):
        return None

    def get_confidence(self, obj):
        return None

    def get_evidence(self, obj):
        return {}

    def get_disclosure(self, obj):
        return _disclosure(
            ai_generated=(obj.source == AIInsight.Source.LLM),
            provider_details=obj.provider_disclosure,
        )


class GenerateInsightSerializer(serializers.Serializer):
    """Accepts BOTH legacy singular and batch payloads.

    * Singular: ``{"service": <one>, "date": <optional>, "force": <bool>}``
    * Batch:    ``{"services": [<many>], "anchor_date": <optional>, "force": <bool>}``
    """

    service = serializers.ChoiceField(choices=INSIGHT_GENERATE_SERVICES, required=False)
    services = serializers.ListField(
        child=serializers.ChoiceField(choices=INSIGHT_GENERATE_SERVICES),
        required=False, allow_empty=False,
    )
    date = serializers.DateField(required=False)
    anchor_date = serializers.DateField(required=False)
    force = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs.get("service") and not attrs.get("services"):
            raise serializers.ValidationError(
                "Provide either 'service' (singular) or 'services' (batch)."
            )
        return attrs
