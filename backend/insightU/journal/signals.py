"""Invalidate journal-derived AI insights when an entry changes or is removed.

Editing or deleting a journal entry must invalidate any cached Journal AI
insight for that entry, so a stale insight never lingers against changed content.
"""
from __future__ import annotations

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import JournalEntry


def _delete_derived(entry):
    from analytics.services.ai.orchestrator import delete_derived_journal_insights

    delete_derived_journal_insights(entry.user_id, entry_id=entry.id)


@receiver(post_save, sender=JournalEntry)
def invalidate_on_edit(sender, instance, created, **kwargs):
    if created:
        return  # new entry: nothing derived yet
    _delete_derived(instance)


@receiver(post_delete, sender=JournalEntry)
def invalidate_on_delete(sender, instance, **kwargs):
    _delete_derived(instance)
