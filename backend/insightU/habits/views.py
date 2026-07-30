import calendar
import re
from datetime import date

from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Habit, HabitCompletion
from .serializers import HabitCompletionSerializer, HabitSerializer


class HabitViewSet(viewsets.ModelViewSet):
    serializer_class = HabitSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Habit.objects.none()
        queryset = Habit.objects.filter(user=self.request.user)
        active = self.request.query_params.get("active")
        if active is not None:
            if active.lower() not in ("true", "false"):
                raise ValidationError({"active": "Use true or false."})
            queryset = queryset.filter(active=active.lower() == "true")
        return queryset

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                serializer.save(user=self.request.user)
        except IntegrityError as exc:
            raise ValidationError({"code": "A habit with this code already exists."}) from exc

    def perform_destroy(self, instance):
        if instance.active:
            instance.active = False
            instance.save(update_fields=("active", "updated_at"))

    @action(detail=False, methods=("get",), url_path="calendar")
    def calendar(self, request):
        month = self._parse_month(request.query_params.get("month"))
        last_day = calendar.monthrange(month.year, month.month)[1]
        start = month
        end = date(month.year, month.month, last_day)

        habits = list(
            Habit.objects.filter(user=request.user)
            .filter(Q(active=True) | Q(completions__date__range=(start, end)))
            .distinct()
            .order_by("name", "id")
        )
        completions = HabitCompletion.objects.filter(
            user=request.user, date__range=(start, end), habit__in=habits
        ).select_related("habit")
        completion_map = {(item.habit_id, item.date): item for item in completions}

        days = []
        for day_number in range(1, last_day + 1):
            current = date(month.year, month.month, day_number)
            scheduled = []
            for habit in habits:
                completion = completion_map.get((habit.id, current))
                is_due = habit.active and current.isoweekday() in habit.schedule_weekdays
                if is_due or completion is not None:
                    scheduled.append({
                        "habit_id": habit.id,
                        "name": habit.name,
                        "code": habit.code,
                        "category": habit.category,
                        "icon": habit.icon,
                        "scheduled": is_due,
                        "completed": completion.completed if completion else False,
                        "completion_id": completion.id if completion else None,
                    })
            days.append({"date": current.isoformat(), "habits": scheduled})

        return Response({"month": month.strftime("%Y-%m"), "days": days})

    @staticmethod
    def _parse_month(value):
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
            raise ValidationError({"month": "Use YYYY-MM format."})
        year, month = (int(part) for part in value.split("-"))
        if year < 1 or year > 9999:
            raise ValidationError({"month": "Use YYYY-MM format."})
        return date(year, month, 1)


class HabitCompletionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = HabitCompletionSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("get", "post", "put", "patch", "head", "options")

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return HabitCompletion.objects.none()
        queryset = HabitCompletion.objects.filter(user=self.request.user).select_related(
            "habit", "check_in"
        )
        params = self.request.query_params
        if "date" in params:
            queryset = queryset.filter(date=self._parse_date(params.get("date"), "date"))
        if "date_from" in params:
            queryset = queryset.filter(date__gte=self._parse_date(params.get("date_from"), "date_from"))
        if "date_to" in params:
            queryset = queryset.filter(date__lte=self._parse_date(params.get("date_to"), "date_to"))
        if "habit" in params:
            try:
                habit_id = int(params.get("habit"))
            except (TypeError, ValueError) as exc:
                raise ValidationError({"habit": "Use a numeric habit id."}) from exc
            queryset = queryset.filter(habit_id=habit_id)
        return queryset

    @staticmethod
    def _parse_date(value, parameter):
        try:
            if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                raise ValueError
            return date.fromisoformat(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({parameter: "Use YYYY-MM-DD format."}) from exc
