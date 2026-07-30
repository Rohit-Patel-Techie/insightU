from rest_framework import serializers
from django.db import transaction

from .models import DailyCheckIn
from profiles.utils import user_local_date
from habits.models import Habit, HabitCompletion


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
    completed_habit_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Habit.objects.none(), write_only=True, required=False
    )
    habit_completion_details = serializers.SerializerMethodField()
    distractions = serializers.ListField(
        child=serializers.ChoiceField(choices=DISTRACTION_CHOICES),
        allow_empty=False,
    )
    habits_completed = serializers.ListField(
        child=serializers.ChoiceField(choices=HABIT_CHOICES),
        allow_empty=True,
        required=False,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["completed_habit_ids"].child_relation.queryset = Habit.objects.filter(user=request.user, active=True)

    class Meta:
        model = DailyCheckIn
        fields = (
            "id",
            "check_in_date",
            "study_category",
            "study_hours",
            "planned_study_status",
            "focus_level",
            "mood",
            "day_type",
            "distractions",
            "distraction_time",
            "habits_completed",
            "completed_habit_ids",
            "habit_completion_details",
            "reflection_went_well",
            "reflection_improve_tomorrow",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "check_in_date", "habit_completion_details", "created_at", "updated_at")

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
                check_in_date=user_local_date(request.user),
            ).exists()
            if exists:
                raise serializers.ValidationError(
                    {"detail": "You have already submitted today's check-in."}
                )

        return attrs


    def get_habit_completion_details(self, instance):
        return [
            {"habit_id": item.habit_id, "name": item.habit.name, "code": item.habit.code, "completed": item.completed}
            for item in instance.habit_completions.select_related("habit").all()
        ]

    def _sync_habits(self, instance, selected_habits):
        if selected_habits is None:
            legacy = instance.habits_completed or []
            selected_habits = list(Habit.objects.filter(user=instance.user, active=True, code__in=legacy))
        selected_ids = {habit.pk for habit in selected_habits}
        due = list(Habit.objects.filter(user=instance.user, active=True))
        due = [habit for habit in due if instance.check_in_date.isoweekday() in habit.schedule_weekdays or habit.pk in selected_ids]
        for habit in due:
            HabitCompletion.objects.update_or_create(
                habit=habit, date=instance.check_in_date,
                defaults={"user": instance.user, "completed": habit.pk in selected_ids, "source": HabitCompletion.Source.CHECKIN, "check_in": instance},
            )
        instance.habits_completed = [habit.code for habit in selected_habits]
        instance.save(update_fields=["habits_completed", "updated_at"])

    @transaction.atomic
    def create(self, validated_data):
        selected = validated_data.pop("completed_habit_ids", None)
        instance = super().create(validated_data)
        self._sync_habits(instance, selected)
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        selected = validated_data.pop("completed_habit_ids", None)
        instance = super().update(instance, validated_data)
        if selected is not None:
            self._sync_habits(instance, selected)
        return instance
