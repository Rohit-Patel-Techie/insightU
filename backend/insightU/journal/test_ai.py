"""Journal AI tests: versioned consent (+ provider policy/disclosure/revocation),
per-entry opt-out, entry AI action (POST/DELETE), edit/delete invalidation,
content-only + HMAC provider context, max-content guard, exposed serializer
result, and the privacy invariant that journal content never enters the
analytics reflection summary and journal saves never wait on AI.
"""
from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from analytics.models import AIInsight
from analytics.services.ai import context as ctx_mod, evidence as ev_mod, orchestrator
from analytics.services.summary import build_summary
from journal.models import JournalAIConsent, JournalEntry


DISCLOSURE_SETTINGS = {
    "AI_PROVIDER_NAME": "Example Provider",
    "AI_PRIVACY_POLICY_URL": "https://example.com/privacy",
    "AI_DATA_RETENTION": "30 days",
}


@override_settings(**DISCLOSURE_SETTINGS)
class JournalConsentTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("j-user", password="pw")
        self.client.force_authenticate(self.user)

    def test_defaults_to_needs_decision_with_disclosure(self):
        resp = self.client.get(reverse("journal:ai-consent"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["needs_decision"])
        self.assertFalse(resp.data["enabled"])
        self.assertIn("disclosure", resp.data)
        self.assertIn("data_retention", resp.data["disclosure"])

    @override_settings(AI_PROVIDER_NAME="Acme", AI_PRIVACY_POLICY_URL="https://p", AI_DATA_RETENTION="30d")
    def test_consent_state_includes_provider_disclosure(self):
        self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        resp = self.client.get(reverse("journal:ai-consent"))
        d = resp.data["disclosure"]
        self.assertEqual(d["provider_name"], "Acme")
        self.assertEqual(d["privacy_policy_url"], "https://p")
        self.assertEqual(d["data_retention"], "30d")

    def test_record_consent_enables_and_records_policy(self):
        resp = self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        self.assertTrue(resp.data["enabled"])
        self.assertFalse(resp.data["needs_decision"])
        self.assertEqual(resp.data["provider_policy_version"], "1")
        self.assertIsNotNone(resp.data["decided_at"])

    @override_settings(AI_PROVIDER_NAME="", AI_PRIVACY_POLICY_URL="", AI_DATA_RETENTION="")
    def test_incomplete_provider_disclosure_blocks_enabling(self):
        state = self.client.get(reverse("journal:ai-consent"))
        self.assertFalse(state.data["disclosure_complete"])
        self.assertFalse(state.data["can_enable"])
        resp = self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("provider name", str(resp.data["enabled"]))
        self.assertFalse(JournalAIConsent.objects.filter(user=self.user).exists())

    @override_settings(AI_PRIVACY_POLICY_URL="http://example.com/privacy")
    def test_non_https_privacy_url_blocks_enabling(self):
        resp = self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_new_consent_version_requires_new_decision(self):
        self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        with override_settings(JOURNAL_AI_CONSENT_VERSION="2"):
            resp = self.client.get(reverse("journal:ai-consent"))
        self.assertTrue(resp.data["needs_decision"])

    def test_new_provider_policy_requires_new_decision(self):
        self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        with override_settings(AI_PROVIDER_POLICY_VERSION="9"):
            resp = self.client.get(reverse("journal:ai-consent"))
        self.assertTrue(resp.data["needs_decision"])

    def test_revoke_via_journal_delete(self):
        self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")
        resp = self.client.delete(reverse("journal:ai-consent"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["revoked"])
        self.assertIsNotNone(JournalAIConsent.objects.get(user=self.user).revoked_at)


@override_settings(**DISCLOSURE_SETTINGS)
class JournalEntryAITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("j2-user", password="pw")
        self.client.force_authenticate(self.user)
        self.entry = JournalEntry.objects.create(
            user=self.user, entry_date=date(2026, 7, 13), title="My day",
            content="I studied hard and felt good.", tags=["study"],
        )

    def _ai_url(self):
        return reverse("journal:entry-ai", args=[self.entry.id])

    def _consent(self):
        self.client.post(reverse("journal:ai-consent"), {"enabled": True}, format="json")

    def test_entry_save_never_creates_insight(self):
        self.assertEqual(AIInsight.objects.count(), 0)

    def test_ai_ineligible_without_consent(self):
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "ineligible")
        self.assertEqual(resp.data["evidence"]["reason"], "consent_not_recorded")
        self.assertEqual(AIInsight.objects.count(), 0)

    def test_ai_generates_with_consent_schema(self):
        self._consent()
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertIn(resp.data["status"], ("fallback", "generated"))
        self.assertEqual(set(resp.data["data"].keys()),
                         {"theme", "expressed_tone", "reflection", "action"})
        self.assertEqual(resp.data["scope_key"] if "scope_key" in resp.data else resp.data["period"]["entry_id"],
                         resp.data["period"]["entry_id"])
        self.assertEqual(resp.data["period"]["entry_id"], self.entry.id)

    def test_ai_respects_per_entry_opt_out(self):
        self._consent()
        self.entry.ai_opt_out = True
        self.entry.save()
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.data["evidence"]["reason"], "entry_opted_out")

    def test_ai_ineligible_when_consent_disabled(self):
        self.client.post(reverse("journal:ai-consent"), {"enabled": False}, format="json")
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.data["evidence"]["reason"], "consent_disabled")

    @patch("analytics.services.ai.adapter.generate_structured")
    def test_ai_blocks_stale_provider_policy_before_provider_call(self, provider):
        self._consent()
        with override_settings(AI_PROVIDER_POLICY_VERSION="2"):
            resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.data["status"], "ineligible")
        self.assertEqual(resp.data["evidence"]["reason"], "consent_outdated")
        provider.assert_not_called()

    @patch("analytics.services.ai.adapter.generate_structured")
    def test_ai_blocks_incomplete_disclosure_before_provider_call(self, provider):
        self._consent()
        with override_settings(AI_DATA_RETENTION=""):
            resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.data["status"], "ineligible")
        self.assertEqual(resp.data["evidence"]["reason"], "provider_disclosure_incomplete")
        provider.assert_not_called()

    @override_settings(AI_JOURNAL_MAX_CONTENT_CHARS=10)
    def test_ai_rejects_over_long_content_without_truncation(self):
        self._consent()
        self.entry.content = "x" * 50
        self.entry.save()
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.data["status"], "ineligible")
        self.assertEqual(resp.data["evidence"]["reason"], "content_too_long")
        self.assertEqual(AIInsight.objects.count(), 0)

    def test_ai_action_delete_removes_derived_insight(self):
        self._consent()
        self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 1)
        resp = self.client.delete(self._ai_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["deleted_insights"], 1)
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 0)

    def test_edit_invalidates_derived_insight(self):
        self._consent()
        self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 1)
        self.client.patch(reverse("journal:entry-detail", args=[self.entry.id]),
                          {"content": "Completely new content."}, format="json")
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 0)

    def test_entry_delete_cascades_insight_removal(self):
        self._consent()
        self.client.post(self._ai_url(), {}, format="json")
        self.client.delete(reverse("journal:entry-detail", args=[self.entry.id]))
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 0)

    def test_action_is_user_scoped(self):
        User = get_user_model()
        other = User.objects.create_user("j2-other", password="pw")
        self.client.force_authenticate(other)
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_service_boundary_rejects_cross_owner_entry(self):
        User = get_user_model()
        other = User.objects.create_user("j2-service-other", password="pw")
        JournalAIConsent.objects.create(
            user=other, consent_version="1", provider_policy_version="1",
            enabled=True, decided_at=timezone.now(),
        )
        with self.assertRaises(PermissionDenied):
            orchestrator.generate_insight(other, "journal_ai", entry=self.entry)

    @patch("analytics.services.ai.adapter.generate_structured")
    def test_consent_change_during_generation_is_not_persisted(self, provider_call):
        from journal import consent_service

        self._consent()
        payload = {
            "theme": "Focus", "expressed_tone": "Steady",
            "reflection": "You returned to the task.", "action": "Use one focus block.",
        }
        def revoke_then_return(*args, **kwargs):
            consent_service.revoke_consent(self.user)
            return payload, "test-model"
        provider_call.side_effect = revoke_then_return
        resp = self.client.post(self._ai_url(), {}, format="json")
        self.assertEqual(resp.data["status"], "ineligible")
        self.assertEqual(resp.data["evidence"]["reason"], "consent_changed_during_generation")
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 0)

    def test_opt_out_writable(self):
        resp = self.client.patch(reverse("journal:entry-detail", args=[self.entry.id]),
                                 {"ai_opt_out": True}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.entry.refresh_from_db()
        self.assertTrue(self.entry.ai_opt_out)

    def test_serializer_exposes_journal_ai_result(self):
        self._consent()
        self.client.post(self._ai_url(), {}, format="json")
        resp = self.client.get(reverse("journal:entry-detail", args=[self.entry.id]))
        self.assertIsNotNone(resp.data["journal_ai"])
        self.assertEqual(resp.data["journal_ai"]["service"], "journal_ai")


@override_settings(**DISCLOSURE_SETTINGS)
class JournalPrivacyTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("j3-user", password="pw")
        self.entry = JournalEntry.objects.create(
            user=self.user, entry_date=date(2026, 7, 13), title="Secret",
            content="I studied hard and felt good.", tags=["study"],
        )

    def test_provider_context_is_content_only(self):
        result = ev_mod.journal_ai(self.user, self.entry)
        # ineligible without consent, but the context builder still enforces shape
        JournalAIConsent.objects.create(user=self.user, consent_version="1",
                                        provider_policy_version="1", enabled=True,
                                        decided_at=timezone.now())
        result = ev_mod.journal_ai(self.user, self.entry)
        ctx = ctx_mod.build_context("journal_ai", result["evidence"])
        self.assertEqual(set(ctx.keys()), {"content"})
        self.assertNotIn("title", ctx)
        self.assertNotIn("tags", ctx)

    def test_public_evidence_uses_hmac_fingerprint_not_raw_content(self):
        JournalAIConsent.objects.create(user=self.user, consent_version="1",
                                        provider_policy_version="1", enabled=True,
                                        decided_at=timezone.now())
        result = ev_mod.journal_ai(self.user, self.entry)
        self.assertIn("fingerprint", result["public_evidence"])
        self.assertNotIn("content", result["public_evidence"])
        self.assertEqual(result["public_evidence"]["fingerprint"],
                         ev_mod._journal_fingerprint(self.entry.content))
        self.assertEqual(result["evidence_hash"],
                         ev_mod._journal_fingerprint(self.entry.content))

    def test_journal_content_never_enters_reflection_summary(self):
        dashboard = {"reported": True, "date": "2026-07-13", "learning_score": {},
                     "seven_day": {}, "components": {}, "distractions": {},
                     "reflection_themes": {}, "goal_alignment": []}
        summary = build_summary(dashboard)
        self.assertNotIn("studied hard", str(summary))
        self.assertNotIn("content", summary)
