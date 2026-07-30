from datetime import date

from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Goal
from .serializers import GoalSerializer


class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Goal.objects.none()

        queryset = Goal.objects.filter(user=self.request.user).prefetch_related("linked_habits")
        params = self.request.query_params

        for parameter, choices in (
            ("category", Goal.Category.values),
            ("priority", Goal.Priority.values),
            ("status", Goal.Status.values),
        ):
            value = params.get(parameter)
            if value:
                if value not in choices:
                    raise ValidationError({parameter: f"Invalid {parameter}."})
                queryset = queryset.filter(**{parameter: value})

        linked_habit = params.get("linked_habit")
        if linked_habit:
            try:
                linked_habit_id = int(linked_habit)
                if linked_habit_id <= 0:
                    raise ValueError
            except (TypeError, ValueError) as exc:
                raise ValidationError({"linked_habit": "Use a positive integer ID."}) from exc
            queryset = queryset.filter(
                linked_habits__id=linked_habit_id,
                linked_habits__user=self.request.user,
            )

        for parameter, lookup in (
            ("start_date_from", "start_date__gte"),
            ("start_date_to", "start_date__lte"),
            ("due_date_from", "due_date__gte"),
            ("due_date_to", "due_date__lte"),
        ):
            value = params.get(parameter)
            if value:
                queryset = queryset.filter(**{lookup: self._parse_date(value, parameter)})

        self._validate_range(params, "start_date_from", "start_date_to")
        self._validate_range(params, "due_date_from", "due_date_to")
        return queryset.distinct()

    @staticmethod
    def _parse_date(value, parameter):
        try:
            return date.fromisoformat(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({parameter: "Use YYYY-MM-DD format."}) from exc

    @classmethod
    def _validate_range(cls, params, start_parameter, end_parameter):
        start = params.get(start_parameter)
        end = params.get(end_parameter)
        if start and end and cls._parse_date(start, start_parameter) > cls._parse_date(end, end_parameter):
            raise ValidationError({end_parameter: "Must be on or after the range start."})

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        goal = self.get_object()
        if goal.status != Goal.Status.ARCHIVED:
            goal.status = Goal.Status.ARCHIVED
            goal.save(update_fields=("status", "updated_at"))
        return Response(status=status.HTTP_204_NO_CONTENT)
