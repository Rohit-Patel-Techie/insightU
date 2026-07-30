from datetime import date

from rest_framework import status, views, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from analytics.services.ai import orchestrator as ai_orchestrator
from analytics.throttles import InsightGenerateThrottle
from analytics.views import _envelope_response

from . import consent_service
from .models import JournalEntry
from .serializers import JournalAIConsentInputSerializer, JournalEntrySerializer


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return JournalEntry.objects.none()
        queryset = JournalEntry.objects.filter(user=self.request.user)
        params = self.request.query_params
        exact_date = params.get("date")
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        if exact_date:
            queryset = queryset.filter(entry_date=self._parse_date(exact_date, "date"))
        if date_from:
            queryset = queryset.filter(entry_date__gte=self._parse_date(date_from, "date_from"))
        if date_to:
            queryset = queryset.filter(entry_date__lte=self._parse_date(date_to, "date_to"))
        if date_from and date_to and self._parse_date(date_from, "date_from") > self._parse_date(date_to, "date_to"):
            raise ValidationError({"date_to": "Must be on or after date_from."})
        return queryset

    @staticmethod
    def _parse_date(value, parameter):
        try:
            return date.fromisoformat(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError({parameter: "Use YYYY-MM-DD format."}) from exc

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path="ai",
        throttle_classes=[InsightGenerateThrottle],
    )
    def ai(self, request, pk=None):
        """Generate (POST) or delete (DELETE) the Journal AI insight for an entry.

        Saving journal entries never triggers or waits on AI; this explicit
        action is the only path that runs Journal AI, and it only ever sends the
        selected entry's own content. Editing or deleting an entry invalidates
        the derived insight automatically (see journal.signals).
        """
        entry = self.get_object()
        if request.method == "DELETE":
            deleted = ai_orchestrator.delete_derived_journal_insights(
                request.user, entry_id=entry.id
            )
            return Response(
                {"status": "deleted", "deleted_insights": deleted},
                status=status.HTTP_200_OK,
            )
        force = bool(request.data.get("force", False))
        envelope = ai_orchestrator.generate_insight(
            request.user, "journal_ai", entry=entry, force=force
        )
        return _envelope_response(envelope)


class JournalAIConsentView(views.APIView):
    """One-time, versioned Journal AI consent (user-scoped).

    Preserved journal-app route; mirrored by the analytics-side alias.
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(consent_service.state_dict(consent_service.get_consent(request.user)))

    def post(self, request):
        serializer = JournalAIConsentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            consent = consent_service.set_consent(request.user, serializer.validated_data["enabled"])
        except consent_service.ProviderDisclosureIncomplete as exc:
            raise ValidationError({"enabled": str(exc)}) from exc
        return Response(consent_service.state_dict(consent), status=status.HTTP_200_OK)

    def delete(self, request):
        consent, deleted = consent_service.revoke_consent(request.user)
        body = consent_service.state_dict(consent)
        body.update({"revoked": True, "deleted_insights": deleted})
        return Response(body, status=status.HTTP_200_OK)
