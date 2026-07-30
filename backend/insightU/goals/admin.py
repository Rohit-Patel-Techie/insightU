from django.contrib import admin

from .models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "category", "priority", "status", "start_date", "due_date")
    list_filter = ("category", "priority", "status")
    search_fields = ("title", "user__username", "user__email")
    filter_horizontal = ("linked_habits",)
    readonly_fields = ("created_at", "updated_at")
