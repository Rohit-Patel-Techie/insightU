from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class UserProfileAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="profile-user", email="profile@example.com", password="StrongPass123!")
        self.url = reverse("user-profile")

    def test_profile_is_created_with_user(self):
        self.assertTrue(UserProfile.objects.filter(user=self.user).exists())

    def test_profile_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_can_retrieve_and_update_profile(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(self.url, {
            "course": "B.Tech", "year": "3", "study_hours": "4.0",
            "study_weekdays": [1, 2, 3, 4, 5], "timezone": "Asia/Kolkata",
            "onboarding_completed": True,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.timezone, "Asia/Kolkata")
        self.assertEqual(self.user.profile.study_days, 5)

    def test_invalid_timezone_is_rejected(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(self.url, {"timezone": "Not/AZone"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_profile_is_repaired(self):
        self.user.profile.delete()
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(UserProfile.objects.filter(user=self.user).exists())


class ProfileOnboardingTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="onboard-user", email="onboard@example.com", password="password")
        self.client.force_authenticate(self.user)
        self.url = reverse("profile-onboarding")

    def test_onboarding_saves_profile_habits_and_goals_transactionally(self):
        response = self.client.post(self.url, {
            "first_name": "Asha", "avatar": "😀", "course": "B.Tech", "year": "2",
            "study_time": "Morning", "study_hours": "3.5", "study_weekdays": [1, 2, 3, 4, 5],
            "timezone": "Asia/Kolkata", "challenges": ["Social Media"], "motivation": "Stay consistent",
            "habits": [{"name": "Coding Practice", "code": "coding_practice", "category": "programming", "icon": "💻", "schedule_weekdays": [1, 2, 3, 4, 5]}],
            "goals": [{"title": "Learn Django", "category": "programming", "priority": "high", "linked_habit_codes": ["coding_practice"]}],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.user.refresh_from_db(); self.user.profile.refresh_from_db()
        self.assertEqual(self.user.first_name, "Asha")
        self.assertTrue(self.user.profile.onboarding_completed)
        from habits.models import Habit
        from goals.models import Goal
        habit = Habit.objects.get(user=self.user, code="coding_practice")
        goal = Goal.objects.get(user=self.user, title="Learn Django")
        self.assertEqual(list(goal.linked_habits.all()), [habit])

    def test_repeated_onboarding_updates_existing_goal(self):
        payload = {
            "course": "B.Tech", "year": "2", "study_time": "Morning", "study_hours": "3.0",
            "study_weekdays": [1, 2, 3, 4, 5], "timezone": "UTC", "habits": [],
            "goals": [{"title": "Learn Django", "category": "programming", "priority": "medium"}],
        }
        self.assertEqual(self.client.post(self.url, payload, format="json").status_code, status.HTTP_200_OK)
        payload["goals"][0]["priority"] = "high"
        self.assertEqual(self.client.post(self.url, payload, format="json").status_code, status.HTTP_200_OK)
        from goals.models import Goal
        self.assertEqual(Goal.objects.filter(user=self.user, title="Learn Django").count(), 1)
        self.assertEqual(Goal.objects.get(user=self.user, title="Learn Django").priority, "high")

    def test_onboarding_is_authenticated(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, {}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)
