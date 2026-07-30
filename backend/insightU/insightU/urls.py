from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/user/", include("profiles.urls")),
    path("api/checkins/", include("checkin.urls")),
    path("api/habits/", include("habits.urls")),
    path("api/goals/", include("goals.urls")),
    path("api/journal/", include("journal.urls")),
    path("api/analytics/", include("analytics.urls")),
]
