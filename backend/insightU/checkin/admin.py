from django.contrib import admin

from .models import DailyCheckIn


@admin.register(DailyCheckIn)
class DailyCheckInAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "check_in_date",
        "study_hours",
        "focus_level",
        "mood",
        "created_at",
    )
    list_filter = ("check_in_date", "focus_level", "mood", "day_type")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("user", "check_in_date", "created_at", "updated_at")
    date_hierarchy = "check_in_date"
