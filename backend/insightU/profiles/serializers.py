from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "username", "email", "first_name", "avatar", "course", "year",
            "goals", "study_time", "study_hours", "study_days", "study_weekdays",
            "challenges", "habits", "motivation", "timezone",
            "onboarding_completed", "created_at", "updated_at",
        ]
        read_only_fields = ["study_days", "created_at", "updated_at"]

    def validate_study_weekdays(self, value):
        value = sorted(set(value))
        if not value:
            raise serializers.ValidationError("Select at least one planned study weekday.")
        if any(not isinstance(day, int) or not 1 <= day <= 7 for day in value):
            raise serializers.ValidationError("Use weekday integers from 1 (Monday) to 7 (Sunday).")
        return value

    def update(self, instance, validated_data):
        weekdays = validated_data.get("study_weekdays")
        if weekdays is not None:
            validated_data["study_days"] = len(weekdays)
        return super().update(instance, validated_data)
