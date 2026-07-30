from django.contrib import admin

from .models import Habit, HabitCompletion


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "code", "category", "active", "source", "updated_at")
    list_filter = ("active", "category", "source")
    search_fields = ("name", "code", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(HabitCompletion)
class HabitCompletionAdmin(admin.ModelAdmin):
    list_display = ("habit", "user", "date", "completed", "source", "check_in")
    list_filter = ("completed", "source", "date")
    search_fields = ("habit__name", "habit__code", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "date"
