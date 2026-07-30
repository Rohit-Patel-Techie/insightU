from datetime import date

from django.db import IntegrityError, transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DailyCheckIn
from .serializers import DailyCheckInSerializer
from profiles.utils import user_local_date


class DailyCheckInViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = DailyCheckInSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("get", "post", "put", "patch", "head", "options")

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return DailyCheckIn.objects.none()

        queryset = DailyCheckIn.objects.filter(user=self.request.user)
        query_params = self.request.query_params

        exact_date = query_params.get("date")
        date_from = query_params.get("date_from")
        date_to = query_params.get("date_to")

        if exact_date:
            queryset = queryset.filter(check_in_date=self._parse_date(exact_date, "date"))
        if date_from:
            queryset = queryset.filter(check_in_date__gte=self._parse_date(date_from, "date_from"))
        if date_to:
            queryset = queryset.filter(check_in_date__lte=self._parse_date(date_to, "date_to"))

        return queryset

    @staticmethod
    def _parse_date(value, parameter):
        try:
            return date.fromisoformat(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({parameter: "Use YYYY-MM-DD format."}) from exc

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                serializer.save(user=self.request.user, check_in_date=user_local_date(self.request.user))
        except IntegrityError as exc:
            raise ValidationError(
                {"detail": "You have already submitted today's check-in."}
            ) from exc

    @action(detail=False, methods=("get",), url_path="today")
    def today(self, request):
        check_in = self.get_queryset().filter(check_in_date=user_local_date(request.user)).first()
        if check_in is None:
            return Response(
                {"detail": "No check-in has been submitted today."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self.get_serializer(check_in).data)
