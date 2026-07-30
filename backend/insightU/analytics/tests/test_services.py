"""Unit tests for the pure deterministic services (no DB required)."""
import datetime as dt

from django.test import SimpleTestCase

from analytics.services.constants import ANALYTICS_VERSION
from analytics.services.distractions import distraction_frequencies
from analytics.services.focus import focus_component
from analytics.services.goals import goal_alignment
from analytics.services.habits import habit_completion_component, scheduled_codes_for_day
from analytics.services.monthly import month_bounds, parse_month
from analytics.services.mood import mood_component
from analytics.services.normalization import DayRecord, build_day_index, missing_record
from analytics.services.reflection import reflection_component
from analytics.services.reflection_themes import extract_themes, theme_frequencies
from analytics.services.score import learning_score
from analytics.services.study import study_completion_component, study_hours_component
from analytics.services.trends import trend
from analytics.services.weekly import week_bounds, week_days


def rec(**kw):
    base = dict(date=dt.date(2026, 7, 6), reported=True)
    base.update(kw)
    return DayRecord(**base)


class StudyComponentTests(SimpleTestCase):
    def test_completion_mapping(self):
        self.assertEqual(study_completion_component(rec(study_status="complete")).score, 1.0)
        self.assertEqual(study_completion_component(rec(study_status="partial")).score, 0.6)
        self.assertEqual(study_completion_component(rec(study_status="not_today")).score, 0.2)

    def test_completion_unavailable_when_missing(self):
        self.assertFalse(study_completion_component(missing_record(dt.date(2026, 7, 6))).available)

    def test_hours_ratio_and_cap(self):
        c = study_hours_component(rec(study_hours=2.0), expected_hours=4.0, is_planned_day=True)
        self.assertEqual(c.score, 0.5)
        self.assertEqual(c.denominator, 4.0)
        capped = study_hours_component(rec(study_hours=6.0), expected_hours=4.0, is_planned_day=True)
        self.assertEqual(capped.score, 1.0)
        self.assertTrue(capped.evidence["capped"])

    def test_hours_unavailable_conditions(self):
        self.assertFalse(study_hours_component(rec(study_hours=2.0), 0, True).available)
        self.assertFalse(study_hours_component(rec(study_hours=2.0), 4.0, False).available)
        self.assertFalse(study_hours_component(missing_record(dt.date(2026, 7, 6)), 4.0, True).available)


class MoodFocusReflectionTests(SimpleTestCase):
    def test_focus_and_mood_maps(self):
        self.assertEqual(focus_component(rec(focus_level="deep_focus")).score, 1.0)
        self.assertEqual(focus_component(rec(focus_level="could_not_focus")).score, 0.2)
        self.assertEqual(mood_component(rec(mood="excellent")).score, 1.0)
        self.assertEqual(mood_component(rec(mood="stressed")).score, 0.2)

    def test_reflection_answered_over_two(self):
        self.assertEqual(reflection_component(rec()).score, 0.0)
        self.assertEqual(reflection_component(rec(reflection_went_well="ok")).score, 0.5)
        self.assertEqual(
            reflection_component(rec(reflection_went_well="a", reflection_improve_tomorrow="b")).score,
            1.0,
        )


class HabitTests(SimpleTestCase):
    def test_scheduled_for_day(self):
        defs = [{"code": "study", "schedule_weekdays": [1, 2, 3, 4, 5], "active": True},
                {"code": "rest", "schedule_weekdays": [6, 7], "active": True}]
        monday = dt.date(2026, 7, 6)
        self.assertEqual(scheduled_codes_for_day(defs, monday), ["study"])

    def test_completion_ratio(self):
        c = habit_completion_component(["a", "b", "c"], {"a", "b"})
        self.assertAlmostEqual(c.score, 2 / 3)
        self.assertEqual(c.denominator, 3.0)

    def test_unavailable_when_none_due(self):
        self.assertFalse(habit_completion_component([], {"a"}).available)


class ScoreTests(SimpleTestCase):
    def _core(self, **scores):
        comps = []
        for name in ("study_completion", "study_hours", "habit", "reflection", "mood"):
            if name in scores:
                from analytics.services.normalization import Component
                comps.append(Component(name, True, scores[name]))
            else:
                from analytics.services.normalization import Component
                comps.append(Component(name, False))
        return comps

    def test_full_five_high_confidence(self):
        r = learning_score(self._core(study_completion=1, study_hours=1, habit=1, reflection=1, mood=1))
        self.assertEqual(r["score"], 100.0)
        self.assertEqual(r["components_used"], "5/5")
        self.assertEqual(r["confidence"], "high")

    def test_partial_low_confidence_mean_of_available(self):
        r = learning_score(self._core(study_completion=1, mood=0.5))
        self.assertEqual(r["score"], 75.0)
        self.assertEqual(r["components_used"], "2/5")
        self.assertEqual(r["confidence"], "low")

    def test_none_available(self):
        r = learning_score(self._core())
        self.assertFalse(r["available"])
        self.assertEqual(r["components_used"], "0/5")


class TrendTests(SimpleTestCase):
    def test_insufficient(self):
        self.assertFalse(trend([1, 2, 3])["available"])

    def test_increasing(self):
        self.assertEqual(trend([10, 10, 20, 20])["direction"], "increasing")

    def test_decreasing(self):
        self.assertEqual(trend([20, 20, 10, 10])["direction"], "decreasing")

    def test_stable(self):
        self.assertEqual(trend([10, 10, 10, 10])["direction"], "stable")


class DistractionThemeTests(SimpleTestCase):
    def test_distraction_counts_only(self):
        recs = [rec(distractions=("youtube", "gaming"), distraction_time="night"),
                rec(distractions=("nothing",)),
                missing_record(dt.date(2026, 7, 7))]
        out = distraction_frequencies(recs)
        self.assertEqual(out["by_type"]["youtube"], 1)
        self.assertEqual(out["by_time"]["night"], 1)
        self.assertEqual(out["reported_days"], 2)
        self.assertNotIn("duration", str(out))

    def test_theme_extraction(self):
        self.assertIn("focus", extract_themes("I lost focus today"))
        self.assertIn("wellbeing", extract_themes("did not sleep well"))
        freq = theme_frequencies([rec(reflection_went_well="stayed focused"),
                                  rec(reflection_improve_tomorrow="sleep earlier")])
        self.assertEqual(freq["days_with_reflection"], 2)


class GoalTests(SimpleTestCase):
    def test_alignment_uses_available_only(self):
        records = [rec(study_status="complete", study_category="programming"),
                   rec(study_status="partial", study_category="academics")]
        out = goal_alignment("programming", [], records, {})
        self.assertTrue(out["available"])
        self.assertEqual(out["components_used"], "2/3")

    def test_alignment_unavailable(self):
        out = goal_alignment(None, [], [missing_record(dt.date(2026, 7, 6))], {})
        self.assertFalse(out["available"])


class CalendarHelperTests(SimpleTestCase):
    def test_week_bounds_monday_sunday(self):
        mon, sun = week_bounds(dt.date(2026, 7, 8))  # Wed
        self.assertEqual(mon, dt.date(2026, 7, 6))
        self.assertEqual(sun, dt.date(2026, 7, 12))
        self.assertEqual(len(week_days(dt.date(2026, 7, 8))), 7)

    def test_month_bounds_and_parse(self):
        self.assertEqual(month_bounds(2026, 2), (dt.date(2026, 2, 1), dt.date(2026, 2, 28)))
        self.assertEqual(parse_month("2026-11"), (2026, 11))
        with self.assertRaises(ValueError):
            parse_month("2026-13")


class NormalizationTests(SimpleTestCase):
    def test_build_day_index_fills_gaps(self):
        idx = build_day_index([], dt.date(2026, 7, 6), dt.date(2026, 7, 8))
        self.assertEqual(len(idx), 3)
        self.assertFalse(idx[dt.date(2026, 7, 7)].reported)

    def test_version_present(self):
        self.assertTrue(ANALYTICS_VERSION)
