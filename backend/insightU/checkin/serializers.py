from django.utils import timezone
from rest_framework import serializers

from .models import DailyCheckIn


DISTRACTION_CHOICES = (
    "social_media",
    "youtube",
    "gaming",
    "friends",
    "sleepiness",
    "family",
    "other_subjects",
    "could_not_concentrate",
    "nothing",
)

HABIT_CHOICES = (
    "study",
    "drink_water",
    "journal",
    "read_book",
    "exercise",
    "sleep_before_11",
)


class DailyCheckInSerializer(serializers.ModelSerializer):
    distractions = serializers.ListField(
        child=serializers.ChoiceField(choices=DISTRACTION_CHOICES),
        allow_empty=False,
    )
    habits_completed = serializers.ListField(
        child=serializers.ChoiceField(choices=HABIT_CHOICES),
        allow_empty=True,
        required=False,
    )

    class Meta:
        model = DailyCheckIn
        fields = (
            "id",
            "check_in_date",
            "study_hours",
            "planned_study_status",
            "focus_level",
            "mood",
            "day_type",
            "distractions",
            "distraction_time",
            "habits_completed",
            "reflection_went_well",
            "reflection_improve_tomorrow",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "check_in_date", "created_at", "updated_at")

    def validate_distractions(self, values):
        if len(values) != len(set(values)):
            raise serializers.ValidationError("Duplicate distraction values are not allowed.")
        if "nothing" in values and len(values) > 1:
            raise serializers.ValidationError("Nothing cannot be combined with another distraction.")
        return values

    def validate_habits_completed(self, values):
        if len(values) != len(set(values)):
            raise serializers.ValidationError("Duplicate habit values are not allowed.")
        return values

    def validate(self, attrs):
        instance = self.instance
        distractions = attrs.get("distractions", getattr(instance, "distractions", []))
        distraction_time = attrs.get(
            "distraction_time",
            getattr(instance, "distraction_time", ""),
        )

        if "nothing" in distractions:
            attrs["distraction_time"] = ""
        elif not distraction_time:
            raise serializers.ValidationError(
                {"distraction_time": "This field is required when a distraction is selected."}
            )

        request = self.context.get("request")
        if instance is None and request and request.user.is_authenticated:
            exists = DailyCheckIn.objects.filter(
                user=request.user,
                check_in_date=timezone.localdate(),
            ).exists()
            if exists:
                raise serializers.ValidationError(
                    {"detail": "You have already submitted today's check-in."}
                )

        return attrs
