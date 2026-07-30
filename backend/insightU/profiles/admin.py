from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "year", "timezone", "onboarding_completed", "updated_at")
    list_filter = ("onboarding_completed", "course", "year", "timezone")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
