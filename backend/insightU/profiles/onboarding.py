from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from goals.models import Goal
from habits.models import Habit

from .models import UserProfile
from .utils import user_local_date


class StarterHabitSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    code = serializers.SlugField(max_length=80, required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=["programming", "academics", "exam_prep", "project", "career", "reading", "other"], default="other")
    icon = serializers.CharField(max_length=80, required=False, allow_blank=True)
    schedule_weekdays = serializers.ListField(child=serializers.IntegerField(min_value=1, max_value=7), allow_empty=False)

    def validate_schedule_weekdays(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Weekdays cannot contain duplicates.")
        return sorted(value)


class StarterGoalSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    category = serializers.ChoiceField(choices=Goal.Category.values)
    priority = serializers.ChoiceField(choices=Goal.Priority.values, default=Goal.Priority.MEDIUM)
    due_date = serializers.DateField(required=False, allow_null=True)
    linked_habit_codes = serializers.ListField(child=serializers.SlugField(max_length=80), required=False, allow_empty=True)


class ProfileOnboardingSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    avatar = serializers.CharField(max_length=10, required=False, allow_blank=True)
    course = serializers.CharField(max_length=100)
    year = serializers.CharField(max_length=10)
    study_time = serializers.ChoiceField(choices=["Morning", "Afternoon", "Evening", "Night"])
    study_hours = serializers.DecimalField(max_digits=3, decimal_places=1, min_value=0, max_value=8)
    study_weekdays = serializers.ListField(child=serializers.IntegerField(min_value=1, max_value=7), allow_empty=False)
    challenges = serializers.ListField(child=serializers.CharField(max_length=80), required=False, allow_empty=True)
    motivation = serializers.CharField(max_length=200, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=64)
    habits = StarterHabitSerializer(many=True, required=False)
    goals = StarterGoalSerializer(many=True, required=False)

    def validate_study_weekdays(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Weekdays cannot contain duplicates.")
        return sorted(value)

    def validate_timezone(self, value):
        from .validators import validate_iana_timezone
        try:
            validate_iana_timezone(value)
        except Exception as exc:
            raise serializers.ValidationError("Enter a valid IANA timezone.") from exc
        return value

    def validate(self, attrs):
        start = user_local_date(self.context["request"].user)
        for goal in attrs.get("goals", []):
            if goal.get("due_date") and goal["due_date"] < start:
                raise serializers.ValidationError({"goals": "Goal due dates cannot be before today."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        user = self.context["request"].user
        data = self.validated_data
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if "first_name" in data:
            user.first_name = data["first_name"].strip()
            user.save(update_fields=["first_name"])
        for field in ("avatar", "course", "year", "study_time", "study_hours", "study_weekdays", "challenges", "motivation", "timezone"):
            if field in data:
                setattr(profile, field, data[field])
        profile.onboarding_completed = True
        profile.habits = [item["name"] for item in data.get("habits", [])]
        profile.goals = [{"title": item["title"], "category": item["category"], "priority": item["priority"]} for item in data.get("goals", [])]
        profile.save()

        selected_codes = []
        habits_by_code = {}
        for item in data.get("habits", []):
            code = item.get("code") or slugify(item["name"])
            selected_codes.append(code)
            habit, _ = Habit.objects.update_or_create(
                user=user, code=code,
                defaults={"name": item["name"], "category": item["category"], "icon": item.get("icon", ""), "schedule_weekdays": item["schedule_weekdays"], "active": True, "source": Habit.Source.PROFILE},
            )
            habits_by_code[code] = habit
        Habit.objects.filter(user=user, source=Habit.Source.PROFILE).exclude(code__in=selected_codes).update(active=False)

        today = user_local_date(user)
        for item in data.get("goals", []):
            goal = Goal.objects.filter(user=user, title=item["title"]).order_by("id").first()
            if goal is None:
                goal = Goal(user=user, title=item["title"], start_date=today)
            goal.category = item["category"]
            goal.priority = item["priority"]
            goal.due_date = item.get("due_date")
            if goal.status == Goal.Status.ARCHIVED:
                goal.status = Goal.Status.ACTIVE
            goal.save()
            linked = [habits_by_code[code] for code in item.get("linked_habit_codes", []) if code in habits_by_code]
            goal.linked_habits.set(linked)
        return profile
