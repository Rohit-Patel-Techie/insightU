from django.db import IntegrityError, transaction
import re
from django.utils.text import slugify
from rest_framework import serializers

from checkin.models import DailyCheckIn

from .models import Habit, HabitCompletion


class StrictDateField(serializers.DateField):
    def to_internal_value(self, value):
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            self.fail("invalid", format="YYYY-MM-DD")
        return super().to_internal_value(value)


class CurrentUserRelatedField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return self.queryset.none()
        return self.queryset.filter(user=request.user)


class HabitSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=80, required=False, allow_blank=True)
    class Meta:
        model = Habit
        fields = (
            "id", "name", "code", "category", "icon", "schedule_weekdays",
            "active", "source", "created_at", "updated_at",
        )
        read_only_fields = ("id", "active", "created_at", "updated_at")
        extra_kwargs = {"code": {"required": False, "allow_blank": True}}
        validators = ()

    def validate_code(self, value):
        normalized = slugify(value)
        if not normalized:
            raise serializers.ValidationError("Enter a valid slug.")
        return normalized

    def validate_schedule_weekdays(self, value):
        # Run model validators now so API clients receive field-level 400 responses.
        field = Habit._meta.get_field("schedule_weekdays")
        try:
            field.run_validators(value)
        except Exception as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return sorted(value)

    def validate(self, attrs):
        request = self.context.get("request")
        if not attrs.get("code") and self.instance is None:
            attrs["code"] = slugify(attrs.get("name", ""))
        if not attrs.get("code"):
            raise serializers.ValidationError({"code": "Enter a valid habit name or code."})
        if request and request.user.is_authenticated:
            code = attrs.get("code", getattr(self.instance, "code", None))
            existing = Habit.objects.filter(user=request.user, code=code)
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            if code and existing.exists():
                raise serializers.ValidationError({"code": "A habit with this code already exists."})
        return attrs


class HabitCompletionSerializer(serializers.ModelSerializer):
    date = StrictDateField()
    habit = CurrentUserRelatedField(queryset=Habit.objects.all())
    check_in = CurrentUserRelatedField(
        queryset=DailyCheckIn.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = HabitCompletion
        fields = (
            "id", "habit", "date", "completed", "source", "check_in",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        validators = ()

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        habit = attrs.get("habit", getattr(self.instance, "habit", None))
        completion_date = attrs.get("date", getattr(self.instance, "date", None))
        check_in = attrs.get("check_in", getattr(self.instance, "check_in", None))

        if user and habit and habit.user_id != user.id:
            raise serializers.ValidationError({"habit": "Invalid habit."})
        if self.instance is None and habit and not habit.active:
            raise serializers.ValidationError({"habit": "Archived habits cannot receive new completions."})
        if check_in and user and check_in.user_id != user.id:
            raise serializers.ValidationError({"check_in": "Invalid check-in."})
        if check_in and completion_date and check_in.check_in_date != completion_date:
            raise serializers.ValidationError(
                {"check_in": "Check-in date must match the completion date."}
            )
        if habit and completion_date:
            existing = HabitCompletion.objects.filter(habit=habit, date=completion_date)
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {"date": "A completion already exists for this habit and date."}
                )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        try:
            with transaction.atomic():
                return HabitCompletion.objects.create(user=request.user, **validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"date": "A completion already exists for this habit and date."}
            ) from exc
