from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from checkin.models import DailyCheckIn
from goals.models import Goal
from habits.models import Habit, HabitCompletion


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user("analytics-user", password="password")
        self.other = User.objects.create_user("analytics-other", password="password")
        profile = self.user.profile
        profile.study_hours = 4
        profile.study_weekdays = [1, 2, 3, 4, 5, 6, 7]
        profile.timezone = "UTC"
        profile.onboarding_completed = True
        profile.save()
        self.day = date(2026, 7, 13)
        self.habit = Habit.objects.create(user=self.user, name="Daily Study", code="study", category="academics", schedule_weekdays=[1, 2, 3, 4, 5, 6, 7])
        self.check_in = DailyCheckIn.objects.create(user=self.user, check_in_date=self.day, study_category="academics", study_hours=3, planned_study_status="partial", focus_level="mostly_focused", mood="good", day_type="productive", distractions=["social_media"], distraction_time="evening", habits_completed=["study"], reflection_went_well="I stayed focused", reflection_improve_tomorrow="Plan earlier")
        HabitCompletion.objects.create(user=self.user, habit=self.habit, date=self.day, completed=True, source="checkin", check_in=self.check_in)
        goal = Goal.objects.create(user=self.user, title="Improve GPA", category="academics", priority="high", status="active", start_date=self.day)
        goal.linked_habits.add(self.habit)
        self.client.force_authenticate(self.user)

    def test_dashboard_is_user_scoped_and_transparent(self):
        response = self.client.get(reverse("analytics:dashboard"), {"date": self.day.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["reported"])
        self.assertEqual(response.data["learning_score"]["components_used"], "5/5")
        self.assertIn("components", response.data["learning_score"])
        self.assertTrue(response.data["goal_alignment"]["configured"])
        self.assertEqual(response.data["distractions"]["items"][0]["count"], 1)
        self.assertNotIn("duration", str(response.data).lower())

    def test_missing_day_is_not_reported_without_score(self):
        response = self.client.get(reverse("analytics:dashboard"), {"date": "2026-07-12"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["reported"])
        self.assertIsNone(response.data["learning_score"]["score"])

    def test_overview_and_calendar_contracts(self):
        overview = self.client.get(reverse("analytics:overview"), {"period": "week", "anchor_date": self.day.isoformat()})
        self.assertEqual(overview.status_code, status.HTTP_200_OK)
        self.assertEqual(overview.data["coverage"]["reported_days"], 1)
        self.assertIn("habit_summary", overview.data)
        calendar = self.client.get(reverse("analytics:calendar"), {"month": "2026-07"})
        self.assertEqual(calendar.status_code, status.HTTP_200_OK)
        reported = [item for item in calendar.data["days"] if item["date"] == self.day.isoformat()][0]
        self.assertEqual(reported["status"], "reported")

    def test_authentication_is_required(self):
        self.client.force_authenticate(None)
        response = self.client.get(reverse("analytics:dashboard"), {"date": self.day.isoformat()})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_future_date_is_rejected(self):
        response = self.client.get(reverse("analytics:dashboard"), {"date": "2999-01-01"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reflection_is_cached_and_private(self):
        first = self.client.post(reverse("analytics:reflections-generate"), {"date": self.day.isoformat()}, format="json")
        second = self.client.post(reverse("analytics:reflections-generate"), {"date": self.day.isoformat()}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["id"], second.data["id"])
        self.client.force_authenticate(self.other)
        listing = self.client.get(reverse("analytics:reflections"))
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 0)
