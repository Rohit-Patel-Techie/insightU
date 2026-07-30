"""Tests for the AI insight layer (revised contract).

Covers strict contracts/validation + safety guards, deterministic evidence +
eligibility, privacy-safe context, the common envelope, the cache-first
orchestrator, force limiting, batch/singular + alias APIs, and consent aliases.
No network is used: the provider is unconfigured (deterministic fallback) except
where the adapter is explicitly patched.
"""
from datetime import timedelta
import urllib.error
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from checkin.models import DailyCheckIn
from goals.models import Goal
from habits.models import Habit, HabitCompletion
from journal.models import JournalAIConsent, JournalEntry

from analytics.models import AIGenerationAttempt, AIInsight, AIReflection
from analytics.services.ai import adapter, context as ctx_mod, orchestrator, transport
from analytics.services.ai.contracts import get_contract, validate_payload
from analytics.services.ai.envelope import build_envelope, disclosure
from analytics.services.weekly import week_bounds

ENVELOPE_KEYS = {
    "service", "status", "source", "model_name", "period", "coverage",
    "confidence", "evidence", "data", "disclosure", "generated_at",
}


def make_checkin(user, day, **overrides):
    defaults = dict(
        user=user, check_in_date=day, study_category="academics", study_hours=3,
        planned_study_status="partial", focus_level="mostly_focused", mood="good",
        day_type="productive", distractions=["social_media"], distraction_time="evening",
        habits_completed=["study"], reflection_went_well="Focused well",
        reflection_improve_tomorrow="Start earlier",
    )
    defaults.update(overrides)
    return DailyCheckIn.objects.create(**defaults)


class ContractValidationTests(TestCase):
    def test_valid_payload(self):
        c = get_contract("daily_coach")
        cleaned = validate_payload(c, {
            "win": " good ", "focus_area": "focus", "tomorrow_action": "act",
            "supportive_note": "note",
        })
        self.assertEqual(cleaned["win"], "good")
        self.assertEqual(cleaned["focus_area"], "focus")

    def test_missing_required_field_rejected(self):
        self.assertIsNone(validate_payload(get_contract("daily_coach"), {"win": "only"}))

    def test_non_dict_rejected(self):
        self.assertIsNone(validate_payload(get_contract("weekly_coach"), ["x"]))

    def test_exact_key_rejection(self):
        c = get_contract("daily_coach")
        payload = {"win": "w", "focus_area": "f", "tomorrow_action": "t",
                   "supportive_note": "n", "extra": "nope"}
        self.assertIsNone(validate_payload(c, payload))

    def test_pattern_truncated_to_max(self):
        c = get_contract("pattern_discovery", pattern_max=7)
        cleaned = validate_payload(c, {
            "headline": "h", "patterns": [f"p{i}" for i in range(20)], "next_action": "a",
        })
        self.assertEqual(len(cleaned["patterns"]), 7)

    def test_empty_required_list_rejected(self):
        self.assertIsNone(validate_payload(
            get_contract("pattern_discovery"),
            {"headline": "h", "patterns": [], "next_action": "a"},
        ))

    @override_settings(AI_MAX_STRING_CHARS=10)
    def test_per_string_length_limit(self):
        c = get_contract("daily_coach")
        base = {"win": "ok", "focus_area": "ok", "tomorrow_action": "ok", "supportive_note": "ok"}
        self.assertIsNone(validate_payload(c, {**base, "win": "x" * 50}))

    @override_settings(AI_MAX_OUTPUT_BYTES=40)
    def test_total_output_size_limit(self):
        c = get_contract("daily_coach")
        payload = {"win": "a" * 30, "focus_area": "b" * 30,
                   "tomorrow_action": "c" * 30, "supportive_note": "d" * 30}
        self.assertIsNone(validate_payload(c, payload))


@override_settings(
    AI_PROVIDER_NAME="Example Provider",
    AI_PRIVACY_POLICY_URL="https://example.com/privacy",
    AI_DATA_RETENTION="30 days",
)
class AdapterSafetyTests(TestCase):
    def test_duplicate_json_keys_raise(self):
        with self.assertRaises(ValueError):
            adapter._reject_duplicate_keys([("a", 1), ("a", 2)])

    def test_provider_redirects_are_rejected(self):
        handler = transport.NoProviderRedirect()
        with self.assertRaises(urllib.error.URLError):
            handler.redirect_request(None, None, 302, "Found", {}, "http://downgrade.test")

    @override_settings(DEBUG=False, LLM_API_BASE_URL="http://insecure", LLM_API_KEY="k")
    def test_https_required_in_production(self):
        self.assertFalse(adapter.is_configured())

    @override_settings(DEBUG=False, LLM_API_BASE_URL="https://secure", LLM_API_KEY="k")
    def test_https_ok_in_production(self):
        self.assertTrue(adapter.is_configured())

    @override_settings(
        LLM_API_BASE_URL="https://secure", LLM_API_KEY="k", AI_PROVIDER_NAME=""
    )
    @patch("analytics.services.ai.adapter._call")
    def test_incomplete_disclosure_prevents_external_call(self, mock_call):
        payload, model = adapter.generate_structured(get_contract("daily_coach"), {})
        self.assertIsNone(payload)
        self.assertEqual(model, "")
        mock_call.assert_not_called()

    @override_settings(LLM_API_BASE_URL="https://x", LLM_API_KEY="k")
    @patch("analytics.services.ai.adapter._call")
    def test_duplicate_keys_in_response_fall_back(self, mock_call):
        mock_call.return_value = '{"win": "a", "win": "b", "focus_area": "f", "tomorrow_action": "t", "supportive_note": "n"}'
        payload, model = adapter.generate_structured(get_contract("daily_coach"), {})
        self.assertIsNone(payload)

    @override_settings(LLM_API_BASE_URL="https://x", LLM_API_KEY="k")
    @patch("analytics.services.ai.adapter._call")
    def test_extra_key_response_falls_back(self, mock_call):
        mock_call.return_value = '{"win": "a", "focus_area": "f", "tomorrow_action": "t", "supportive_note": "n", "rogue": 1}'
        payload, model = adapter.generate_structured(get_contract("daily_coach"), {})
        self.assertIsNone(payload)

    @override_settings(LLM_API_BASE_URL="https://x", LLM_API_KEY="k")
    @patch("analytics.services.ai.adapter._call")
    def test_valid_response_accepted(self, mock_call):
        mock_call.return_value = '{"win": "a", "focus_area": "f", "tomorrow_action": "t", "supportive_note": "n"}'
        payload, model = adapter.generate_structured(get_contract("daily_coach"), {})
        self.assertEqual(payload, {"win": "a", "focus_area": "f", "tomorrow_action": "t", "supportive_note": "n"})


class ContextPrivacyTests(TestCase):
    def test_context_allows_reported_timing_but_scrubs_inferred_performance(self):
        # Approved Option A: reported distraction timing + declared preference are
        # allowed; inferred strongest study performance/timing is never sent.
        out = ctx_mod.build_context("daily_coach", {
            "reported_days": 5,
            "reported_distraction_time": "evening",
            "preferred_study_time": "morning",
            "best_study_time": "morning",     # inferred performance -> scrubbed
            "strongest_study_time": "9am",    # inferred performance -> scrubbed
            "top_distractions": ["social_media"],
        })
        self.assertIn("reported_distraction_time", out)
        self.assertIn("preferred_study_time", out)
        self.assertNotIn("best_study_time", out)
        self.assertNotIn("strongest_study_time", out)

    def test_goal_title_scrubbed_from_provider_context(self):
        out = ctx_mod.build_context("goal_coach", {"title": "Secret goal", "category": "academics"})
        self.assertNotIn("title", out)
        self.assertIn("category", out)

    def test_journal_context_is_content_only(self):
        out = ctx_mod.build_context("journal_ai", {"content": "body"})
        self.assertEqual(set(out.keys()), {"content"})


class EnvelopeTests(TestCase):
    def test_disclosure_flags(self):
        self.assertFalse(disclosure(ai_generated=False)["ai_generated"])
        self.assertTrue(disclosure(ai_generated=True)["ai_generated"])

    @override_settings(AI_PROVIDER_POLICY_VERSION="9")
    def test_unattributed_legacy_result_does_not_inherit_current_policy(self):
        result = disclosure(ai_generated=True, provider_details={})
        self.assertIsNone(result["provider"])
        self.assertIsNone(result["policy_version"])

    def test_envelope_has_all_keys(self):
        env = build_envelope("daily_coach", "ineligible",
                             builder={"period": {}, "coverage": {}, "public_evidence": {}},
                             reason="x")
        self.assertEqual(set(env.keys()), ENVELOPE_KEYS)


class OrchestratorTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("ai-user", password="pw")
        p = self.user.profile
        p.study_hours = 4
        p.study_weekdays = [1, 2, 3, 4, 5, 6, 7]
        p.timezone = "UTC"
        p.onboarding_completed = True
        p.save()
        self.today = timezone.localdate()
        self.habit = Habit.objects.create(
            user=self.user, name="Study", code="study", category="academics",
            schedule_weekdays=[1, 2, 3, 4, 5, 6, 7],
        )

    def _seed(self, day):
        ci = make_checkin(self.user, day)
        HabitCompletion.objects.create(user=self.user, habit=self.habit, date=day,
                                       completed=True, source="checkin", check_in=ci)
        return ci

    def test_daily_ineligible_without_checkin(self):
        env = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(env["status"], "ineligible")
        self.assertEqual(env["evidence"]["reason"], "no_check_in_for_day")
        self.assertIn("coverage", env["evidence"])
        self.assertEqual(AIGenerationAttempt.objects.get().status, "ineligible")

    def test_daily_fallback_and_cache_first(self):
        self._seed(self.today)
        first = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(first["status"], "fallback")
        self.assertEqual(first["source"], "fallback")
        self.assertIn("win", first["data"])
        self.assertEqual(set(first.keys()), ENVELOPE_KEYS)
        second = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(second["status"], "cache_hit")
        self.assertEqual(AIInsight.objects.count(), 1)

    def test_cache_invalidates_on_evidence_change(self):
        ci = self._seed(self.today)
        orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        ci.mood = "stressed"
        ci.save()
        orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(AIInsight.objects.count(), 2)

    @patch("analytics.services.ai.adapter.generate_structured")
    def test_cache_invalidates_and_attribution_stays_immutable_on_provider_change(self, mock_gen):
        from analytics.serializers import AIInsightSerializer

        mock_gen.return_value = ({"win": "Great", "focus_area": "f", "tomorrow_action": "t", "supportive_note": "n"}, "model-a")
        self._seed(self.today)
        with override_settings(
            AI_PROVIDER_NAME="Provider A",
            AI_PRIVACY_POLICY_URL="https://a.example/privacy",
            AI_DATA_RETENTION="7 days",
            AI_PROVIDER_POLICY_VERSION="1",
        ):
            first = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        old_row = AIInsight.objects.get()
        with override_settings(
            AI_PROVIDER_NAME="Provider B",
            AI_PRIVACY_POLICY_URL="https://b.example/privacy",
            AI_DATA_RETENTION="30 days",
            AI_PROVIDER_POLICY_VERSION="2",
        ):
            serialized_old = AIInsightSerializer(old_row).data
            second = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(first["disclosure"]["provider"], "Provider A")
        self.assertEqual(serialized_old["disclosure"]["provider"], "Provider A")
        self.assertEqual(second["disclosure"]["provider"], "Provider B")
        self.assertEqual(mock_gen.call_count, 2)
        self.assertEqual(AIInsight.objects.count(), 2)

    @patch("analytics.services.ai.adapter.generate_structured")
    def test_llm_payload_used_when_valid(self, mock_gen):
        mock_gen.return_value = ({"win": "Great", "focus_area": "f", "tomorrow_action": "t", "supportive_note": "n"}, "test-model")
        self._seed(self.today)
        env = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(env["status"], "generated")
        self.assertEqual(env["source"], "llm")
        self.assertEqual(env["data"]["win"], "Great")
        self.assertEqual(env["model_name"], "test-model")
        self.assertTrue(env["disclosure"]["ai_generated"])

    def test_force_limit(self):
        self._seed(self.today)
        with override_settings(AI_INSIGHT_FORCE_MAX_PER_HOUR=2):
            r1 = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today, force=True)
            r2 = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today, force=True)
            r3 = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today, force=True)
        self.assertIn(r1["status"], ("generated", "fallback"))
        self.assertEqual(r3["status"], "throttled")
        self.assertEqual(r3["evidence"]["retry_after"], 3600)

    def test_attempts_metadata_only(self):
        self._seed(self.today)
        orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        fields = {f.name for f in AIGenerationAttempt._meta.get_fields()}
        self.assertFalse(fields & {"content", "evidence", "context", "prompt"})

    def test_goal_selection_priority_then_due(self):
        self._seed(self.today)
        Goal.objects.create(user=self.user, title="Low", category="academics",
                            priority="low", status="active", start_date=self.today)
        Goal.objects.create(user=self.user, title="High-Far", category="academics",
                            priority="high", status="active", start_date=self.today,
                            due_date=self.today + timedelta(days=30))
        near = Goal.objects.create(user=self.user, title="High-Near", category="academics",
                                   priority="high", status="active", start_date=self.today,
                                   due_date=self.today + timedelta(days=5))
        env = orchestrator.generate_insight(self.user, "goal_coach", anchor=self.today)
        self.assertEqual(env["period"]["kind"], "rolling")
        self.assertEqual(env["evidence"]["title"], "High-Near")
        self.assertEqual(AIInsight.objects.filter(scope_key=f"goal:{near.id}").count(), 1)

    def test_goal_ineligible_without_goals(self):
        env = orchestrator.generate_insight(self.user, "goal_coach", anchor=self.today)
        self.assertEqual(env["status"], "ineligible")
        self.assertEqual(env["evidence"]["reason"], "no_active_goals")

    def test_pattern_requires_seven_reported_days(self):
        for i in range(6):
            make_checkin(self.user, self.today - timedelta(days=i))
        env = orchestrator.generate_insight(self.user, "pattern_discovery", anchor=self.today)
        self.assertEqual(env["status"], "ineligible")
        self.assertEqual(env["evidence"]["reason"], "insufficient_reported_days")
        self.assertEqual(env["coverage"]["required_reported_days"], 7)
        make_checkin(self.user, self.today - timedelta(days=6))
        env = orchestrator.generate_insight(self.user, "pattern_discovery", anchor=self.today)
        self.assertIn(env["status"], ("fallback", "generated"))
        self.assertLessEqual(len(env["data"]["patterns"]), 7)

    def test_weekly_requires_three_reported_days(self):
        anchor = self.today - timedelta(days=7)  # a fully-elapsed previous week
        monday, _ = week_bounds(anchor)
        make_checkin(self.user, monday)
        make_checkin(self.user, monday + timedelta(days=1))
        env = orchestrator.generate_insight(self.user, "weekly_coach", anchor=anchor)
        self.assertEqual(env["status"], "ineligible")
        make_checkin(self.user, monday + timedelta(days=2))
        env = orchestrator.generate_insight(self.user, "weekly_coach", anchor=anchor)
        self.assertIn(env["status"], ("fallback", "generated"))
        self.assertIn("next_week_focus", env["data"])
        self.assertIn("biggest_win", env["data"])
        self.assertEqual(env["period"]["start"], monday.isoformat())

    def test_anchor_threads_to_scope(self):
        anchor = self.today - timedelta(days=3)
        env = orchestrator.generate_insight(self.user, "pattern_discovery", anchor=anchor)
        # scope reflects anchor even when ineligible
        self.assertEqual(env["period"]["end"], anchor.isoformat())


@override_settings(AI_PROVIDER_NAME="Example Provider", AI_PRIVACY_POLICY_URL="https://example.com/privacy", AI_DATA_RETENTION="30 days")
class InsightAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("api-user", password="pw")
        self.other = User.objects.create_user("api-other", password="pw")
        p = self.user.profile
        p.study_hours = 4
        p.study_weekdays = [1, 2, 3, 4, 5, 6, 7]
        p.timezone = "UTC"
        p.onboarding_completed = True
        p.save()
        self.today = timezone.localdate()
        make_checkin(self.user, self.today)
        self.client.force_authenticate(self.user)

    def test_singular_generate_returns_envelope(self):
        resp = self.client.post(reverse("analytics:insights-generate"),
                                {"service": "daily_coach"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(set(resp.data.keys()), ENVELOPE_KEYS)
        self.assertIn("win", resp.data["data"])

    def test_batch_generate_returns_map(self):
        resp = self.client.post(reverse("analytics:insights-generate"), {
            "services": ["daily_coach", "goal_coach", "pattern_discovery", "weekly_coach"],
            "anchor_date": self.today.isoformat(),
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("insights", resp.data)
        self.assertEqual(set(resp.data["insights"].keys()),
                         {"daily_coach", "goal_coach", "pattern_discovery", "weekly_coach"})
        for env in resp.data["insights"].values():
            self.assertEqual(set(env.keys()), ENVELOPE_KEYS)

    def test_alias_routes_work(self):
        gen = self.client.post(reverse("analytics:ai-insights-generate"),
                               {"service": "daily_coach"}, format="json")
        self.assertEqual(gen.status_code, status.HTTP_200_OK)
        lst = self.client.get(reverse("analytics:ai-insights"))
        self.assertEqual(lst.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(lst.data), 1)

    def test_journal_ai_not_allowed_via_analytics(self):
        resp = self.client.post(reverse("analytics:insights-generate"),
                                {"service": "journal_ai"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_anchor_rejected(self):
        future = (self.today + timedelta(days=5)).isoformat()
        resp = self.client.post(reverse("analytics:insights-generate"),
                                {"service": "daily_coach", "date": future}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_required(self):
        self.client.force_authenticate(None)
        resp = self.client.post(reverse("analytics:insights-generate"),
                                {"service": "daily_coach"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_user_scoped_and_envelope_compatible(self):
        self.client.post(reverse("analytics:insights-generate"),
                         {"service": "daily_coach"}, format="json")
        resp = self.client.get(reverse("analytics:insights"))
        self.assertEqual(len(resp.data), 1)
        row = resp.data[0]
        for key in ("service", "status", "source", "data", "disclosure", "generated_at"):
            self.assertIn(key, row)
        self.client.force_authenticate(self.other)
        self.assertEqual(len(self.client.get(reverse("analytics:insights")).data), 0)

    def test_list_filter_by_service(self):
        self.client.post(reverse("analytics:insights-generate"),
                         {"service": "daily_coach"}, format="json")
        resp = self.client.get(reverse("analytics:insights"), {"service": "weekly_coach"})
        self.assertEqual(len(resp.data), 0)

    def test_legacy_reflection_still_works(self):
        resp = self.client.post(reverse("analytics:reflections-generate"),
                                {"date": self.today.isoformat()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(AIReflection.objects.filter(user=self.user).count(), 1)

    @patch("analytics.api_service.generate_reflection_text")
    def test_legacy_reflection_cache_tracks_provider_and_attribution(self, generate):
        generate.side_effect = [
            ("Provider A output", "llm", "model-a"),
            ("Provider B output", "llm", "model-b"),
        ]
        with override_settings(
            AI_PROVIDER_NAME="Provider A",
            AI_PRIVACY_POLICY_URL="https://a.example/privacy",
            AI_DATA_RETENTION="7 days",
            AI_PROVIDER_POLICY_VERSION="1",
        ):
            first = self.client.post(reverse("analytics:reflections-generate"),
                                     {"date": self.today.isoformat()}, format="json")
        with override_settings(
            AI_PROVIDER_NAME="Provider B",
            AI_PRIVACY_POLICY_URL="https://b.example/privacy",
            AI_DATA_RETENTION="30 days",
            AI_PROVIDER_POLICY_VERSION="2",
        ):
            second = self.client.post(reverse("analytics:reflections-generate"),
                                      {"date": self.today.isoformat()}, format="json")
        self.assertEqual(first.data["provider_disclosure"]["provider_name"], "Provider A")
        self.assertEqual(second.data["provider_disclosure"]["provider_name"], "Provider B")
        self.assertEqual(generate.call_count, 2)
        self.assertEqual(AIReflection.objects.filter(user=self.user).count(), 2)

    def test_analytics_consent_alias_get_post_and_revoke(self):
        get = self.client.get(reverse("analytics:ai-consent"))
        self.assertTrue(get.data["needs_decision"])
        post = self.client.post(reverse("analytics:ai-consent"), {"enabled": True}, format="json")
        self.assertTrue(post.data["enabled"])
        self.assertEqual(post.data["provider_policy_version"], "1")
        # seed a journal-derived insight, then revoke
        entry = JournalEntry.objects.create(user=self.user, entry_date=self.today,
                                            title="t", content="hello world", tags=[])
        orchestrator.generate_insight(self.user, "journal_ai", entry=entry)
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 1)
        delete = self.client.delete(reverse("analytics:ai-consent-service", args=["journal_ai"]))
        self.assertEqual(delete.status_code, status.HTTP_200_OK)
        self.assertTrue(delete.data["revoked"])
        self.assertEqual(AIInsight.objects.filter(service="journal_ai").count(), 0)
        self.assertIsNotNone(JournalAIConsent.objects.get(user=self.user).revoked_at)

    def test_analytics_consent_unknown_service_404(self):
        resp = self.client.delete(reverse("analytics:ai-consent-service", args=["bogus"]))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class SchemaAndContextTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("schema-user", password="pw")
        p = self.user.profile
        p.study_hours = 4
        p.study_weekdays = [1, 2, 3, 4, 5, 6, 7]
        p.timezone = "UTC"
        p.study_time = "morning"
        p.challenges = ["procrastination", "phone"]
        p.onboarding_completed = True
        p.save()
        self.today = timezone.localdate()
        self.habit = Habit.objects.create(
            user=self.user, name="Study", code="study", category="academics",
            schedule_weekdays=[1, 2, 3, 4, 5, 6, 7],
        )

    def test_daily_schema_and_safe_preferences(self):
        make_checkin(self.user, self.today, distraction_time="evening")
        env = orchestrator.generate_insight(self.user, "daily_coach", anchor=self.today)
        self.assertEqual(set(env["data"].keys()),
                         {"win", "focus_area", "tomorrow_action", "supportive_note"})
        ev = env["evidence"]
        self.assertEqual(ev["preferred_study_time"], "morning")
        self.assertEqual(ev["challenge_labels"], ["procrastination", "phone"])
        self.assertEqual(ev["reported_distraction_time"], "evening")

    def test_score_explanation_schema(self):
        make_checkin(self.user, self.today)
        env = orchestrator.generate_insight(self.user, "score_explanation", anchor=self.today)
        self.assertEqual(set(env["data"].keys()), {"main_factor", "explanation", "best_next_step"})

    def test_goal_schema_and_category_distribution(self):
        make_checkin(self.user, self.today, study_category="academics")
        make_checkin(self.user, self.today - timedelta(days=1), study_category="programming")
        goal = Goal.objects.create(user=self.user, title="GPA", category="academics",
                                   priority="high", status="active", start_date=self.today)
        goal.linked_habits.add(self.habit)
        env = orchestrator.generate_insight(self.user, "goal_coach", anchor=self.today)
        self.assertEqual(set(env["data"].keys()), {"evidence_summary", "current_focus", "next_action"})
        dist = env["evidence"]["study_category_distribution"]
        self.assertEqual(dist.get("academics"), 1)
        self.assertEqual(dist.get("programming"), 1)

    def test_pattern_schema(self):
        for i in range(7):
            make_checkin(self.user, self.today - timedelta(days=i))
        env = orchestrator.generate_insight(self.user, "pattern_discovery", anchor=self.today)
        self.assertEqual(set(env["data"].keys()), {"headline", "patterns", "next_action"})

    def test_weekly_schema_and_best_worst_day(self):
        anchor = self.today - timedelta(days=7)
        monday, _ = week_bounds(anchor)
        make_checkin(self.user, monday, planned_study_status="complete", focus_level="deep_focus", mood="excellent")
        make_checkin(self.user, monday + timedelta(days=1), planned_study_status="not_today", focus_level="could_not_focus", mood="stressed")
        make_checkin(self.user, monday + timedelta(days=2))
        env = orchestrator.generate_insight(self.user, "weekly_coach", anchor=anchor)
        self.assertEqual(set(env["data"].keys()), {"biggest_win", "challenge", "next_week_focus"})
        self.assertIsNotNone(env["evidence"]["best_reported_day"])
        self.assertIsNotNone(env["evidence"]["worst_reported_day"])

    def test_journal_prompt_not_labeled_anonymized(self):
        from analytics.services.ai.contracts import get_contract as gc
        self.assertNotIn("anonymized", gc("journal_ai").context_label.lower())
        self.assertIn("anonymized", gc("daily_coach").context_label.lower())

    def test_numbers_are_server_owned_rule(self):
        from analytics.services.ai.contracts import get_contract as gc
        self.assertIn("number", gc("daily_coach").system_prompt.lower())


@override_settings(
    AI_PROVIDER_NAME="Example Provider",
    AI_PRIVACY_POLICY_URL="https://example.com/privacy",
    AI_DATA_RETENTION="30 days",
)
class BoundedReadTests(TestCase):
    @override_settings(LLM_API_BASE_URL="https://x", LLM_API_KEY="k", AI_MAX_RESPONSE_BYTES=5)
    def test_oversized_response_falls_back(self):
        class _Resp:
            def __enter__(self):
                return self
            def __exit__(self, *a):
                return False
            def read(self, n=-1):
                return b"x" * 100  # larger than AI_MAX_RESPONSE_BYTES(+1)
        with patch("analytics.services.ai.transport.open_no_redirect", return_value=_Resp()):
            payload, model = adapter.generate_structured(get_contract("daily_coach"), {})
        self.assertIsNone(payload)
