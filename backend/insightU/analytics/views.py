"""User-scoped, authenticated analytics APIs.

Every endpoint requires authentication and only ever operates on
``request.user`` data — there is no way to read another user's analytics.
"""
from __future__ import annotations

import datetime as _dt

from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import api_service, data
from .models import AIInsight, AIReflection
from .serializers import (
    AIInsightSerializer,
    AIReflectionSerializer,
    GenerateInsightSerializer,
    GenerateReflectionSerializer,
)
from .services.monthly import parse_month
from .throttles import (
    AnalyticsReadThrottle,
    InsightGenerateThrottle,
    InsightReadThrottle,
    ReflectionGenerateThrottle,
)
from .services.ai import orchestrator as ai_orchestrator
from journal import consent_service
from journal.serializers import JournalAIConsentInputSerializer


def _parse_date(value, field="date"):
    try:
        return _dt.date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field: "Use YYYY-MM-DD format."}) from exc


class DashboardView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (AnalyticsReadThrottle,)

    def get(self, request):
        date_param = request.query_params.get("date")
        today = data.local_today(request.user)
        day = _parse_date(date_param) if date_param else today
        if day > today:
            raise ValidationError({"date": "Future analytics are not available."})
        return Response(api_service.assemble_dashboard(request.user, day))


class OverviewView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (AnalyticsReadThrottle,)

    def get(self, request):
        period = (request.query_params.get("period") or "week").lower()
        if period not in ("week", "month"):
            raise ValidationError({"period": "Use 'week' or 'month'."})
        anchor_param = request.query_params.get("anchor_date")
        anchor = _parse_date(anchor_param, "anchor_date") if anchor_param else data.local_today(request.user)
        return Response(api_service.assemble_overview(request.user, period, anchor))


class CalendarView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (AnalyticsReadThrottle,)

    def get(self, request):
        month_param = request.query_params.get("month")
        if month_param:
            try:
                year, month = parse_month(month_param)
            except ValueError as exc:
                raise ValidationError({"month": str(exc)}) from exc
        else:
            today = data.local_today(request.user)
            year, month = today.year, today.month
        return Response(api_service.assemble_calendar(request.user, year, month))


class ReflectionListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (AnalyticsReadThrottle,)
    serializer_class = AIReflectionSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return AIReflection.objects.none()
        qs = AIReflection.objects.filter(user=self.request.user)
        date_param = self.request.query_params.get("date")
        if date_param:
            qs = qs.filter(date=_parse_date(date_param))
        return qs


class ReflectionGenerateView(APIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (ReflectionGenerateThrottle,)

    def post(self, request):
        serializer = GenerateReflectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        today = data.local_today(request.user)
        day = serializer.validated_data.get("date") or today
        if day > today:
            raise ValidationError({"date": "Future reflections are not available."})
        force = serializer.validated_data.get("force", False)
        reflection = api_service.generate_reflection(request.user, day, force=force)
        return Response(
            AIReflectionSerializer(reflection).data, status=status.HTTP_200_OK
        )



class InsightGenerateView(APIView):
    """Cache-first, user-scoped AI insight generation for analytics services.

    Accepts BOTH the legacy singular payload ``{service, date}`` and the batch
    payload ``{services: [...], anchor_date}``. The anchor date is applied to all
    services (daily/score use it as the day; goal/pattern/weekly use it as the
    window anchor). journal_ai is intentionally excluded here (generated via the
    journal-entry AI action so it only ever receives the selected entry content).

    Singular -> a single envelope. Batch -> ``{"insights": {service: envelope}}``.
    """

    permission_classes = (IsAuthenticated,)
    throttle_classes = (InsightGenerateThrottle,)

    def _resolve_anchor(self, request, value):
        today = data.local_today(request.user)
        if not value:
            return today
        anchor = value if isinstance(value, _dt.date) else _parse_date(value)
        if anchor > today:
            raise ValidationError({"anchor_date": "Future insights are not available."})
        return anchor

    def post(self, request):
        serializer = GenerateInsightSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data
        force = vd.get("force", False)

        if vd.get("services"):
            anchor = self._resolve_anchor(request, vd.get("anchor_date"))
            insights = {}
            for svc in vd["services"]:
                insights[svc] = ai_orchestrator.generate_insight(
                    request.user, svc, anchor=anchor, force=force
                )
            return Response({"insights": insights}, status=status.HTTP_200_OK)

        service = vd["service"]
        anchor = self._resolve_anchor(request, vd.get("date"))
        envelope = ai_orchestrator.generate_insight(
            request.user, service, anchor=anchor, force=force
        )
        return _envelope_response(envelope)

class InsightListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    throttle_classes = (InsightReadThrottle,)
    serializer_class = AIInsightSerializer

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return AIInsight.objects.none()
        qs = AIInsight.objects.filter(user=self.request.user)
        service = self.request.query_params.get("service")
        if service:
            qs = qs.filter(service=service)
        scope_key = self.request.query_params.get("scope_key")
        if scope_key:
            qs = qs.filter(scope_key=scope_key)
        return qs


def _envelope_response(envelope):
    """Turn a single generation envelope into an HTTP response (shared)."""
    code = status.HTTP_200_OK
    resp = Response(envelope, status=code)
    if envelope.get("status") == ai_orchestrator.THROTTLED:
        resp.status_code = status.HTTP_429_TOO_MANY_REQUESTS
        retry_after = (envelope.get("evidence") or {}).get("retry_after")
        if retry_after:
            resp["Retry-After"] = str(retry_after)
    return resp


class AIConsentView(APIView):
    """Analytics-side alias for Journal AI consent (GET/POST)."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(consent_service.state_dict(consent_service.get_consent(request.user)))

    def post(self, request):
        input_serializer = JournalAIConsentInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        try:
            consent = consent_service.set_consent(request.user, input_serializer.validated_data["enabled"])
        except consent_service.ProviderDisclosureIncomplete as exc:
            raise ValidationError({"enabled": str(exc)}) from exc
        return Response(consent_service.state_dict(consent), status=status.HTTP_200_OK)


class AIConsentServiceView(APIView):
    """Analytics-side consent revocation: DELETE /ai-consent/<service>/."""

    permission_classes = (IsAuthenticated,)

    def delete(self, request, service):
        if service != "journal_ai":
            raise NotFound("Unknown consent service.")
        consent, deleted = consent_service.revoke_consent(request.user)
        body = consent_service.state_dict(consent)
        body.update({"revoked": True, "deleted_insights": deleted})
        return Response(body, status=status.HTTP_200_OK)
