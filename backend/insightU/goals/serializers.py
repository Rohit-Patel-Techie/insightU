from rest_framework import serializers

from habits.models import Habit

from .models import Goal


class GoalSerializer(serializers.ModelSerializer):
    linked_habits = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Habit.objects.none(),
        required=False,
    )

    class Meta:
        model = Goal
        fields = (
            "id", "title", "category", "priority", "status", "linked_habits",
            "start_date", "due_date", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None and request.user.is_authenticated:
            self.fields["linked_habits"].child_relation.queryset = Habit.objects.filter(
                user=request.user
            )

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be blank.")
        return value

    def validate(self, attrs):
        instance = self.instance
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        due_date = attrs.get("due_date", getattr(instance, "due_date", None))
        if start_date is not None and due_date is not None and due_date < start_date:
            raise serializers.ValidationError(
                {"due_date": "Due date must be on or after start date."}
            )
        return attrs
