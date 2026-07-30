from django.contrib import admin

from .models import AIReflection


@admin.register(AIReflection)
class AIReflectionAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "source", "model_name", "version", "created_at")
    list_filter = ("source", "version", "date")
    search_fields = ("user__username", "user__email", "summary_hash")
    readonly_fields = (
        "user", "date", "version", "summary_hash", "content",
        "source", "model_name", "created_at", "updated_at",
    )
    date_hierarchy = "date"

    def has_add_permission(self, request):
        return False
