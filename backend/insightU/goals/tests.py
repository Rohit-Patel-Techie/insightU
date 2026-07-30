from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from habits.models import Habit
from .models import Goal
from .views import GoalViewSet


class GoalAPITests(APITestCase):
    def setUp(self):
        users = get_user_model()
        self.user = users.objects.create_user(username="owner", password="StrongPass123!")
        self.other_user = users.objects.create_user(username="other", password="StrongPass123!")
        self.factory = APIRequestFactory()
        self.own_habit = self.make_habit(self.user, "read", "Read")
        self.other_habit = self.make_habit(self.other_user, "code", "Code")
        self.payload = {
            "title": "Finish capstone", "category": "project", "priority": "high",
            "status": "active", "linked_habits": [self.own_habit.pk],
            "start_date": "2026-07-01", "due_date": "2026-07-31",
        }

    @staticmethod
    def make_habit(user, code, name):
        return Habit.objects.create(
            user=user, name=name, code=code, category="other", icon="check",
            schedule_weekdays=[1, 2, 3, 4, 5], active=True, source="manual",
        )

    def call(self, method, path, user=None, data=None, action=None, pk=None):
        request = getattr(self.factory, method)(path, data=data, format="json")
        if user is not None:
            force_authenticate(request, user=user)
        response = GoalViewSet.as_view({method: action})(request, **({"pk": pk} if pk else {}))
        response.render()
        return response

    def make_goal(self, user=None, **overrides):
        values = dict(
            user=user or self.user, title="A goal", category="project", priority="medium",
            status="active", start_date=date(2026, 7, 1), due_date=date(2026, 7, 31),
        )
        values.update(overrides)
        return Goal.objects.create(**values)

    def test_authentication_is_required(self):
        response = self.call("get", "/api/goals/", action="list")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_full_crud_assigns_user_and_never_exposes_progress(self):
        created = self.call("post", "/api/goals/", self.user, self.payload, "create")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        goal = Goal.objects.get()
        self.assertEqual(goal.user, self.user)
        self.assertEqual(list(goal.linked_habits.all()), [self.own_habit])
        self.assertNotIn("user", created.data)
        self.assertNotIn("progress", created.data)
        retrieved = self.call("get", f"/api/goals/{goal.pk}/", self.user, action="retrieve", pk=goal.pk)
        self.assertEqual(retrieved.status_code, status.HTTP_200_OK)
        updated = self.call("patch", f"/api/goals/{goal.pk}/", self.user, {"title": "Updated"}, "partial_update", goal.pk)
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["title"], "Updated")
        deleted = self.call("delete", f"/api/goals/{goal.pk}/", self.user, action="destroy", pk=goal.pk)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        goal.refresh_from_db()
        self.assertEqual(goal.status, Goal.Status.ARCHIVED)

    def test_progress_is_not_stored(self):
        self.assertNotIn("progress", {field.name for field in Goal._meta.get_fields()})

    def test_linked_habits_must_be_owned_on_create_and_update(self):
        response = self.call("post", "/api/goals/", self.user, {**self.payload, "linked_habits": [self.other_habit.pk]}, "create")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("linked_habits", response.data)
        goal = self.make_goal()
        goal.linked_habits.add(self.own_habit)
        response = self.call("patch", f"/api/goals/{goal.pk}/", self.user, {"linked_habits": [self.other_habit.pk]}, "partial_update", goal.pk)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(list(goal.linked_habits.all()), [self.own_habit])

    def test_list_retrieve_update_and_delete_are_user_scoped(self):
        own = self.make_goal(title="Owner only")
        other = self.make_goal(user=self.other_user, title="Other private")
        listed = self.call("get", "/api/goals/", self.user, action="list")
        self.assertEqual([item["id"] for item in listed.data], [own.pk])
        self.assertNotIn(b"Other private", listed.content)
        for method, data, action in (
            ("get", None, "retrieve"), ("patch", {"title": "stolen"}, "partial_update"),
            ("delete", None, "destroy"),
        ):
            response = self.call(method, f"/api/goals/{other.pk}/", self.user, data, action, other.pk)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other.refresh_from_db()
        self.assertEqual((other.title, other.status), ("Other private", Goal.Status.ACTIVE))

    def test_choice_and_linked_habit_filters(self):
        match = self.make_goal(priority="high")
        match.linked_habits.add(self.own_habit)
        self.make_goal(priority="low", category="reading", status="completed")
        path = f"/api/goals/?status=active&category=project&priority=high&linked_habit={self.own_habit.pk}"
        response = self.call("get", path, self.user, action="list")
        self.assertEqual([item["id"] for item in response.data], [match.pk])

    def test_date_filters_are_inclusive(self):
        match = self.make_goal(start_date=date(2026, 7, 10), due_date=date(2026, 7, 20))
        self.make_goal(start_date=date(2026, 7, 9), due_date=date(2026, 7, 21))
        response = self.call("get", "/api/goals/?start_date_from=2026-07-10&due_date_to=2026-07-20", self.user, action="list")
        self.assertEqual([item["id"] for item in response.data], [match.pk])

    def test_invalid_filter_values_return_400(self):
        queries = (
            "status=unknown", "category=unknown", "priority=urgent", "linked_habit=bad",
            "start_date_from=bad", "due_date_from=2026-08-01&due_date_to=2026-07-01",
        )
        for query in queries:
            with self.subTest(query=query):
                response = self.call("get", f"/api/goals/?{query}", self.user, action="list")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_payloads_return_400(self):
        cases = (
            ({"category": "invalid"}, "category"), ({"priority": "urgent"}, "priority"),
            ({"status": "deleted"}, "status"), ({"due_date": "2026-06-30"}, "due_date"),
            ({"title": "   "}, "title"),
        )
        for override, field in cases:
            with self.subTest(field=field):
                response = self.call("post", "/api/goals/", self.user, {**self.payload, **override}, "create")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)
