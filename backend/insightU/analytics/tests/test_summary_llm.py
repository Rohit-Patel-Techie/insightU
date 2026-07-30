"""Tests for the compact summary (privacy) and the LLM adapter/fallback."""
import json
from unittest import mock

from django.test import SimpleTestCase, override_settings

from analytics.services import llm
from analytics.services.summary import build_summary, deterministic_fallback, summary_hash


def sample_dashboard():
    return {
        "date": "2026-07-06",
        "reported": True,
        "learning_score": {"score": 80.0, "confidence": "high", "components_used": "5/5"},
        "components": {
            "study_completion": {"available": True, "score": 1.0},
            "study_hours": {"available": True, "score": 0.5},
            "focus": {"available": True, "score": 0.8},
            "habit": {"available": True, "score": 1.0},
            "reflection": {"available": True, "score": 1.0},
            "mood": {"available": True, "score": 0.8},
        },
        "streak": 4,
        "seven_day": {"trend": {"direction": "increasing"}, "coverage": {"ratio": 0.85}},
        "distractions": {"by_type": {"youtube": 2, "gaming": 1}},
        "reflection_themes": {"themes": {"focus": 2, "wellbeing": 1}},
        "goal_alignment": [{"category": "programming", "alignment": {"score": 70.0}}],
        # Fields that must NOT leak into the summary:
        "check_in_summary": {"reflection_went_well": "SECRET RAW TEXT"},
    }


class SummaryTests(SimpleTestCase):
    def test_summary_is_compact_and_privacy_safe(self):
        s = build_summary(sample_dashboard())
        blob = json.dumps(s)
        self.assertNotIn("SECRET RAW TEXT", blob)
        self.assertNotIn("reflection_went_well", blob)
        self.assertEqual(s["learning_score"], 80.0)
        self.assertEqual(s["reflection_themes"], ["focus", "wellbeing"])
        self.assertEqual(s["top_distractions"], ["youtube", "gaming"])

    def test_hash_stable_and_sensitive(self):
        s = build_summary(sample_dashboard())
        self.assertEqual(summary_hash(s), summary_hash(dict(s)))
        s2 = dict(s)
        s2["learning_score"] = 10.0
        self.assertNotEqual(summary_hash(s), summary_hash(s2))

    def test_fallback_text_no_reported(self):
        text = deterministic_fallback({"reported": False})
        self.assertIn("No check-in", text)

    def test_fallback_text_reported(self):
        s = build_summary(sample_dashboard())
        text = deterministic_fallback(s)
        self.assertIn("Learning Score", text)


@override_settings(
    AI_PROVIDER_NAME="Example Provider",
    AI_PRIVACY_POLICY_URL="https://example.com/privacy",
    AI_DATA_RETENTION="30 days",
)
class LLMAdapterTests(SimpleTestCase):
    @override_settings(LLM_API_BASE_URL="", LLM_API_KEY="")
    def test_fallback_when_not_configured(self):
        text, source, model = llm.generate_reflection_text({"reported": True, "learning_score": 50})
        self.assertEqual(source, "fallback")
        self.assertEqual(model, "")
        self.assertTrue(text)

    @override_settings(
        LLM_API_BASE_URL="https://example.test/v1", LLM_API_KEY="k",
        LLM_MODEL="test-model",
    )
    def test_llm_path_with_mock(self):
        fake = json.dumps({"choices": [{"message": {"content": "Great work today!"}}]}).encode()

        class FakeResp:
            def __enter__(self): return self
            def __exit__(self, *a): return False
            def read(self): return fake

        with mock.patch("analytics.services.ai.transport.open_no_redirect", return_value=FakeResp()):
            text, source, model = llm.generate_reflection_text({"reported": True})
        self.assertEqual(source, "llm")
        self.assertEqual(model, "test-model")
        self.assertEqual(text, "Great work today!")

    @override_settings(
        LLM_API_BASE_URL="https://example.test/v1", LLM_API_KEY="k",
        AI_PROVIDER_NAME="",
    )
    def test_incomplete_disclosure_never_calls_provider(self):
        with mock.patch("analytics.services.ai.transport.open_no_redirect") as outbound:
            text, source, model = llm.generate_reflection_text({"reported": True})
        self.assertEqual(source, "fallback")
        self.assertEqual(model, "")
        outbound.assert_not_called()

    @override_settings(LLM_API_BASE_URL="https://example.test/v1", LLM_API_KEY="k")
    def test_llm_error_falls_back(self):
        with mock.patch("analytics.services.ai.transport.open_no_redirect", side_effect=OSError("boom")):
            text, source, _ = llm.generate_reflection_text({"reported": True, "learning_score": 50})
        self.assertEqual(source, "fallback")
        self.assertTrue(text)

