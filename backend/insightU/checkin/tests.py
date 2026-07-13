from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DailyCheckIn


class DailyCheckInAPITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="rahul",
            email="rahul@example.com",
            password="StrongPass123!",
        )
        self.other_user = user_model.objects.create_user(
            username="other",
            email="other@example.com",
            password="StrongPass123!",
        )
        self.list_url = reverse("checkin:checkin-list")
        self.today_url = reverse("checkin:checkin-today")
        self.payload = {
            "study_hours": 3.5,
            "planned_study_status": "complete",
            "focus_level": "deep_focus",
            "mood": "good",
            "day_type": "productive",
            "distractions": ["social_media", "youtube"],
            "distraction_time": "evening",
            "habits_completed": ["study", "drink_water"],
            "reflection_went_well": "I completed my planned study session.",
            "reflection_improve_tomorrow": "I will avoid social media during study time.",
        }

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def create_check_in(self, user=None, **overrides):
        data = {**self.payload, **overrides}
        return DailyCheckIn.objects.create(
            user=user or self.user,
            check_in_date=timezone.localdate(),
            **data,
        )

    def test_authentication_is_required(self):
        response = self.client.post(self.list_url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_uses_authenticated_user(self):
        self.authenticate()
        response = self.client.post(self.list_url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        check_in = DailyCheckIn.objects.get()
        self.assertEqual(check_in.user, self.user)
        self.assertEqual(check_in.check_in_date, timezone.localdate())

    def test_duplicate_check_in_for_same_day_is_rejected(self):
        self.create_check_in()
        self.authenticate()
        response = self.client.post(self.list_url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DailyCheckIn.objects.filter(user=self.user).count(), 1)

    def test_users_only_list_their_own_check_ins(self):
        self.create_check_in(user=self.user)
        self.create_check_in(user=self.other_user)
        self.authenticate(self.user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["mood"], "good")

    def test_user_cannot_retrieve_another_users_check_in(self):
        other_check_in = self.create_check_in(user=self.other_user)
        self.authenticate(self.user)
        detail_url = reverse("checkin:checkin-detail", args=[other_check_in.pk])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_today_returns_current_users_check_in(self):
        check_in = self.create_check_in()
        self.authenticate()
        response = self.client.get(self.today_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], check_in.pk)

    def test_today_returns_404_when_missing(self):
        self.authenticate()
        response = self.client.get(self.today_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nothing_cannot_be_combined_with_other_distractions(self):
        self.authenticate()
        payload = {**self.payload, "distractions": ["nothing", "youtube"]}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("distractions", response.data)

    def test_distraction_time_is_required_for_a_real_distraction(self):
        self.authenticate()
        payload = {**self.payload, "distraction_time": ""}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("distraction_time", response.data)

    def test_nothing_clears_distraction_time(self):
        self.authenticate()
        payload = {**self.payload, "distractions": ["nothing"], "distraction_time": "evening"}
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["distraction_time"], "")

    def test_invalid_date_filter_returns_400(self):
        self.authenticate()
        response = self.client.get(self.list_url, {"date": "not-a-date"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authenticated_user_can_patch_own_check_in(self):
        check_in = self.create_check_in()
        self.authenticate()
        detail_url = reverse("checkin:checkin-detail", args=[check_in.pk])
        response = self.client.patch(detail_url, {"mood": "excellent"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        check_in.refresh_from_db()
        self.assertEqual(check_in.mood, "excellent")
