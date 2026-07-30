from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from checkin.models import DailyCheckIn

from .models import Habit, HabitCompletion


class HabitModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user("model-user")
        cls.other_user = get_user_model().objects.create_user("model-other")

    def test_user_and_code_are_unique_together(self):
        Habit.objects.create(user=self.user, name="Read", code="read", schedule_weekdays=[1])
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Habit.objects.create(user=self.user, name="Read more", code="read", schedule_weekdays=[2])
        Habit.objects.create(user=self.other_user, name="Read", code="read", schedule_weekdays=[1])

    def test_schedule_weekdays_rejects_non_list_out_of_range_and_duplicates(self):
        invalid_values = ("1,2", [0], [8], [1, 1], [True])
        for value in invalid_values:
            with self.subTest(value=value):
                habit = Habit(user=self.user, name="Invalid", code="invalid", schedule_weekdays=value)
                with self.assertRaises(DjangoValidationError):
                    habit.full_clean()

    def test_completion_relations_must_share_owner(self):
        habit = Habit.objects.create(
            user=self.other_user, name="Other habit", code="other", schedule_weekdays=[1]
        )
        completion = HabitCompletion(
            user=self.user, habit=habit, date=date(2026, 7, 13), completed=True
        )
        with self.assertRaises(DjangoValidationError):
            completion.full_clean()

    def test_habit_and_date_are_unique(self):
        habit = Habit.objects.create(
            user=self.user, name="Study", code="study", schedule_weekdays=[1]
        )
        HabitCompletion.objects.create(user=self.user, habit=habit, date=date(2026, 7, 13))
        with self.assertRaises(IntegrityError):
            HabitCompletion.objects.create(user=self.user, habit=habit, date=date(2026, 7, 13))


class HabitAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.user = user_model.objects.create_user("habit-user", password="password")
        cls.other_user = user_model.objects.create_user("habit-other", password="password")

    def setUp(self):
        self.client.force_authenticate(self.user)
        self.habit_list_url = reverse("habits:habit-list")
        self.completion_list_url = reverse("habits:completion-list")
        self.calendar_url = reverse("habits:habit-calendar")

    def make_habit(self, user=None, **overrides):
        data = {
            "user": user or self.user,
            "name": "Daily study",
            "code": "daily-study",
            "category": "academics",
            "icon": "book",
            "schedule_weekdays": [1, 3, 5],
        }
        data.update(overrides)
        return Habit.objects.create(**data)

    def test_authentication_is_required_for_all_collections(self):
        self.client.force_authenticate(user=None)
        for url in (self.habit_list_url, self.completion_list_url, self.calendar_url):
            with self.subTest(url=url):
                response = self.client.get(url, {"month": "2026-07"})
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_habit_assigns_user_normalizes_code_and_weekdays(self):
        response = self.client.post(
            self.habit_list_url,
            {
                "name": "Morning Review",
                "code": "Morning Review",
                "category": "exam_prep",
                "icon": "notes",
                "schedule_weekdays": [5, 1, 3],
                "active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        habit = Habit.objects.get()
        self.assertEqual(habit.user, self.user)
        self.assertEqual(habit.code, "morning-review")
        self.assertEqual(habit.schedule_weekdays, [1, 3, 5])
        self.assertTrue(habit.active)

    def test_invalid_schedule_weekdays_return_field_errors(self):
        for weekdays in ([0], [8], [1, 1], [True], "1,2"):
            with self.subTest(weekdays=weekdays):
                response = self.client.post(
                    self.habit_list_url,
                    {"name": "Bad", "code": "bad", "schedule_weekdays": weekdays},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("schedule_weekdays", response.data)

    def test_duplicate_code_is_rejected_only_within_user(self):
        self.make_habit()
        response = self.client.post(
            self.habit_list_url,
            {"name": "Duplicate", "code": "daily-study", "schedule_weekdays": [2]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", response.data)
        self.make_habit(user=self.other_user)

    def test_list_retrieve_update_are_user_scoped(self):
        own = self.make_habit()
        other = self.make_habit(user=self.other_user)
        response = self.client.get(self.habit_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [own.id])
        other_url = reverse("habits:habit-detail", args=[other.id])
        self.assertEqual(self.client.get(other_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(other_url, {"name": "stolen"}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_delete_archives_without_erasing(self):
        habit = self.make_habit()
        detail_url = reverse("habits:habit-detail", args=[habit.id])
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        habit.refresh_from_db()
        self.assertFalse(habit.active)
        self.assertTrue(Habit.objects.filter(pk=habit.pk).exists())

    def test_delete_cannot_archive_another_users_habit(self):
        other = self.make_habit(user=self.other_user)
        response = self.client.delete(reverse("habits:habit-detail", args=[other.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other.refresh_from_db()
        self.assertTrue(other.active)

    def test_active_filter_is_validated(self):
        self.assertEqual(
            self.client.get(self.habit_list_url, {"active": "yes"}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_create_completion_assigns_user(self):
        habit = self.make_habit()
        response = self.client.post(
            self.completion_list_url,
            {"habit": habit.id, "date": "2026-07-13", "completed": True, "source": "manual"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        completion = HabitCompletion.objects.get()
        self.assertEqual(completion.user, self.user)
        self.assertEqual(completion.habit, habit)

    def test_completion_rejects_other_users_habit_without_disclosure(self):
        other = self.make_habit(user=self.other_user)
        response = self.client.post(
            self.completion_list_url,
            {"habit": other.id, "date": "2026-07-13", "completed": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("habit", response.data)
        self.assertNotIn("Other habit", str(response.data))

    def test_completion_list_retrieve_and_update_are_user_scoped(self):
        own_habit = self.make_habit()
        other_habit = self.make_habit(user=self.other_user)
        own = HabitCompletion.objects.create(
            user=self.user, habit=own_habit, date=date(2026, 7, 13)
        )
        other = HabitCompletion.objects.create(
            user=self.other_user, habit=other_habit, date=date(2026, 7, 13)
        )
        response = self.client.get(self.completion_list_url)
        self.assertEqual([item["id"] for item in response.data], [own.id])
        other_url = reverse("habits:completion-detail", args=[other.id])
        self.assertEqual(self.client.get(other_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(other_url, {"completed": False}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_completion_delete_is_not_available(self):
        habit = self.make_habit()
        completion = HabitCompletion.objects.create(
            user=self.user, habit=habit, date=date(2026, 7, 13)
        )
        response = self.client.delete(reverse("habits:completion-detail", args=[completion.id]))
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(HabitCompletion.objects.filter(pk=completion.pk).exists())

    def test_duplicate_completion_is_rejected(self):
        habit = self.make_habit()
        HabitCompletion.objects.create(user=self.user, habit=habit, date=date(2026, 7, 13))
        response = self.client.post(
            self.completion_list_url,
            {"habit": habit.id, "date": "2026-07-13", "completed": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date", response.data)

    def test_archived_habit_rejects_new_completion(self):
        habit = self.make_habit(active=False)
        response = self.client.post(
            self.completion_list_url,
            {"habit": habit.id, "date": "2026-07-13", "completed": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("habit", response.data)

    def test_completion_validates_date_payload_and_filters(self):
        habit = self.make_habit()
        for invalid in ("2026-7-01", "2026-02-30", "not-a-date"):
            with self.subTest(invalid=invalid):
                response = self.client.post(
                    self.completion_list_url,
                    {"habit": habit.id, "date": invalid, "completed": True},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("date", response.data)
        for parameter in ("date", "date_from", "date_to"):
            response = self.client.get(self.completion_list_url, {parameter: "2026-2-01"})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(parameter, response.data)

    def test_check_in_must_be_owned_and_match_date(self):
        habit = self.make_habit()
        check_in = self.make_check_in(self.user, date(2026, 7, 12))
        response = self.client.post(
            self.completion_list_url,
            {"habit": habit.id, "date": "2026-07-13", "check_in": check_in.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("check_in", response.data)
        other_check_in = self.make_check_in(self.other_user, date(2026, 7, 13))
        response = self.client.post(
            self.completion_list_url,
            {"habit": habit.id, "date": "2026-07-13", "check_in": other_check_in.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("check_in", response.data)

    def test_calendar_requires_strict_valid_month(self):
        for invalid in (None, "", "2026-7", "2026-00", "2026-13", "0000-01", "text"):
            with self.subTest(invalid=invalid):
                params = {} if invalid is None else {"month": invalid}
                response = self.client.get(self.calendar_url, params)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("month", response.data)

    def test_calendar_reports_schedule_and_completion_without_other_user_data(self):
        own = self.make_habit(name="Own habit", code="own", schedule_weekdays=[1])
        other = self.make_habit(
            user=self.other_user, name="Secret habit", code="secret", schedule_weekdays=[1]
        )
        own_completion = HabitCompletion.objects.create(
            user=self.user, habit=own, date=date(2026, 7, 6), completed=True
        )
        HabitCompletion.objects.create(
            user=self.other_user, habit=other, date=date(2026, 7, 6), completed=True
        )
        response = self.client.get(self.calendar_url, {"month": "2026-07"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["month"], "2026-07")
        self.assertEqual(len(response.data["days"]), 31)
        july_sixth = response.data["days"][5]
        self.assertEqual(july_sixth["date"], "2026-07-06")
        self.assertEqual(len(july_sixth["habits"]), 1)
        item = july_sixth["habits"][0]
        self.assertEqual(item["habit_id"], own.id)
        self.assertEqual(item["completion_id"], own_completion.id)
        self.assertTrue(item["scheduled"])
        self.assertTrue(item["completed"])
        self.assertNotIn("Secret", str(response.data))

    @staticmethod
    def make_check_in(user, check_in_date):
        return DailyCheckIn.objects.create(
            user=user,
            check_in_date=check_in_date,
            study_hours=1,
            planned_study_status="complete",
            focus_level="average",
            mood="good",
            day_type="productive",
            distractions=["nothing"],
        )
