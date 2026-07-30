"""Integration tests exercising the habits/goals data paths end-to-end.

Guarded with skipUnless so the suite still passes in environments where the
habits/goals apps are not installed (the engine degrades to 'unavailable').
"""
import datetime as dt

from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()

HAS_HABITS = apps.is_installed("habits")
HAS_GOALS = apps.is_installed("goals")


def _checkin(user, day, **ov):
    from checkin.models import DailyCheckIn
    f = dict(
        user=user, check_in_date=day, study_hours=4.0, study_category="programming",
        planned_study_status="complete", focus_level="deep_focus", mood="good",
        day_type="productive", distractions=["youtube"], distraction_time="night",
        habits_completed=["study"], reflection_went_well="focused",
        reflection_improve_tomorrow="sleep earlier",
    )
    f.update(ov)
    return DailyCheckIn.objects.create(**f)


from unittest import skipUnless


@skipUnless(HAS_HABITS, "habits app not installed")
class HabitIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("hana", "h@example.com", "pw12345!")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.day = dt.date(2026, 7, 6)  # Monday

    def test_habit_component_available_with_real_models(self):
        from habits.models import Habit, HabitCompletion
        habit = Habit.objects.create(
            user=self.user, name="Study", code="study",
            schedule_weekdays=[1, 2, 3, 4, 5], active=True,
        )
        ci = _checkin(self.user, self.day)
        HabitCompletion.objects.create(
            user=self.user, habit=habit, date=self.day, completed=True, check_in=ci
        )
        resp = self.client.get("/api/analytics/dashboard/", {"date": self.day.isoformat()})
        self.assertEqual(resp.status_code, 200)
        habit_comp = resp.json()["components"]["habit"]
        self.assertTrue(habit_comp["available"])
        self.assertEqual(habit_comp["score"], 1.0)


@skipUnless(HAS_HABITS and HAS_GOALS, "habits/goals apps not installed")
class GoalIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("greg", "g@example.com", "pw12345!")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.day = dt.date(2026, 7, 6)

    def test_goal_alignment_available(self):
        from goals.models import Goal
        _checkin(self.user, self.day, study_category="programming")
        Goal.objects.create(
            user=self.user, title="Learn Django", category="programming",
            status="active", start_date=self.day,
        )
        resp = self.client.get("/api/analytics/dashboard/", {"date": self.day.isoformat()})
        self.assertEqual(resp.status_code, 200)
        alignments = resp.json()["goal_alignment"]["items"]
        mine = [a for a in alignments if a["title"] == "Learn Django"]
        self.assertEqual(len(mine), 1)
        self.assertTrue(mine[0]["alignment"]["available"])
        self.assertEqual(mine[0]["category"], "programming")
