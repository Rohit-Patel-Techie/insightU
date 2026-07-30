from django.contrib import admin
from .models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "entry_date", "created_at", "updated_at")
    list_filter = ("entry_date",)
    search_fields = ("title", "content", "user__username", "user__email")
    readonly_fields = ("created_at", "updated_at")
