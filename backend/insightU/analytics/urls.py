from django.urls import path

from .views import (
    AIConsentServiceView,
    AIConsentView,
    CalendarView,
    DashboardView,
    InsightGenerateView,
    InsightListView,
    OverviewView,
    ReflectionGenerateView,
    ReflectionListView,
)

app_name = "analytics"

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("overview/", OverviewView.as_view(), name="overview"),
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("reflections/", ReflectionListView.as_view(), name="reflections"),
    path("reflections/generate/", ReflectionGenerateView.as_view(), name="reflections-generate"),
    # Canonical insight routes.
    path("insights/", InsightListView.as_view(), name="insights"),
    path("insights/generate/", InsightGenerateView.as_view(), name="insights-generate"),
    # Alias routes (preferred by the frontend integration).
    path("ai-insights/", InsightListView.as_view(), name="ai-insights"),
    path("ai-insights/generate/", InsightGenerateView.as_view(), name="ai-insights-generate"),
    # AI consent alias (mirrors the journal consent route).
    path("ai-consent/", AIConsentView.as_view(), name="ai-consent"),
    path("ai-consent/<str:service>/", AIConsentServiceView.as_view(), name="ai-consent-service"),
]
