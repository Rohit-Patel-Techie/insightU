from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import JournalAIConsentView, JournalEntryViewSet

app_name = "journal"
router = DefaultRouter()
router.register("", JournalEntryViewSet, basename="entry")

urlpatterns = [
    path("ai/consent/", JournalAIConsentView.as_view(), name="ai-consent"),
] + router.urls
