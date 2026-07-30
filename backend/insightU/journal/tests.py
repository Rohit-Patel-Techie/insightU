from datetime import date

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from .models import JournalEntry
from .views import JournalEntryViewSet


class JournalEntryAPITests(APITestCase):
    def setUp(self):
        users = get_user_model()
        self.user = users.objects.create_user(username="owner", password="StrongPass123!")
        self.other_user = users.objects.create_user(username="other", password="StrongPass123!")
        self.factory = APIRequestFactory()
        self.payload = {
            "entry_date": "2026-07-14", "title": "Study reflection",
            "content": "I stayed focused and finished the chapter.", "tags": ["study", "focus"],
        }

    def call(self, method, path, user=None, data=None, action=None, pk=None):
        request = getattr(self.factory, method)(path, data=data, format="json")
        if user is not None:
            force_authenticate(request, user=user)
        response = JournalEntryViewSet.as_view({method: action})(request, **({"pk": pk} if pk else {}))
        response.render()
        return response

    def make_entry(self, user=None, **overrides):
        values = dict(
            user=user or self.user, entry_date=date(2026, 7, 14), title="Private title",
            content="Private content", tags=["private"],
        )
        values.update(overrides)
        return JournalEntry.objects.create(**values)

    def test_authentication_is_required(self):
        response = self.call("get", "/api/journal/", action="list")
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_full_crud_assigns_authenticated_user(self):
        created = self.call("post", "/api/journal/", self.user, self.payload, "create")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        entry = JournalEntry.objects.get()
        self.assertEqual(entry.user, self.user)
        self.assertNotIn("user", created.data)
        retrieved = self.call("get", f"/api/journal/{entry.pk}/", self.user, action="retrieve", pk=entry.pk)
        self.assertEqual(retrieved.data["content"], self.payload["content"])
        updated = self.call("patch", f"/api/journal/{entry.pk}/", self.user, {"content": "Updated private content"}, "partial_update", entry.pk)
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        deleted = self.call("delete", f"/api/journal/{entry.pk}/", self.user, action="destroy", pk=entry.pk)
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(JournalEntry.objects.filter(pk=entry.pk).exists())

    def test_multiple_entries_per_date_are_allowed(self):
        first = self.call("post", "/api/journal/", self.user, self.payload, "create")
        second = self.call("post", "/api/journal/", self.user, {**self.payload, "title": "Second"}, "create")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(JournalEntry.objects.count(), 2)

    def test_list_does_not_leak_other_users_title_content_or_tags(self):
        own = self.make_entry(title="Owner title", content="Owner secret", tags=["owner-tag"])
        self.make_entry(user=self.other_user, title="Other title", content="Other secret", tags=["other-tag"])
        response = self.call("get", "/api/journal/", self.user, action="list")
        self.assertEqual([item["id"] for item in response.data], [own.pk])
        for secret in (b"Other title", b"Other secret", b"other-tag"):
            self.assertNotIn(secret, response.content)

    def test_cross_user_retrieve_update_and_delete_return_404(self):
        other = self.make_entry(user=self.other_user)
        for method, data, action in (
            ("get", None, "retrieve"), ("patch", {"content": "stolen"}, "partial_update"),
            ("delete", None, "destroy"),
        ):
            response = self.call(method, f"/api/journal/{other.pk}/", self.user, data, action, other.pk)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other.refresh_from_db()
        self.assertEqual(other.content, "Private content")

    def test_exact_date_filter_is_user_scoped(self):
        match = self.make_entry(entry_date=date(2026, 7, 14))
        self.make_entry(entry_date=date(2026, 7, 15))
        self.make_entry(user=self.other_user, entry_date=date(2026, 7, 14))
        response = self.call("get", "/api/journal/?date=2026-07-14", self.user, action="list")
        self.assertEqual([item["id"] for item in response.data], [match.pk])

    def test_date_range_filter_is_inclusive(self):
        first = self.make_entry(entry_date=date(2026, 7, 10))
        last = self.make_entry(entry_date=date(2026, 7, 20))
        self.make_entry(entry_date=date(2026, 7, 21))
        response = self.call("get", "/api/journal/?date_from=2026-07-10&date_to=2026-07-20", self.user, action="list")
        self.assertEqual({item["id"] for item in response.data}, {first.pk, last.pk})

    def test_invalid_date_filters_return_400(self):
        for query in ("date=bad", "date_from=2026-99-01", "date_from=2026-07-20&date_to=2026-07-10"):
            with self.subTest(query=query):
                response = self.call("get", f"/api/journal/?{query}", self.user, action="list")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_title_and_content_are_rejected(self):
        for override, field in (({"title": "   "}, "title"), ({"content": "   "}, "content")):
            response = self.call("post", "/api/journal/", self.user, {**self.payload, **override}, "create")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(field, response.data)

    def test_tags_must_be_unique_nonblank_strings_with_length_limit(self):
        invalid_tags = (["same", "same"], ["ok", "   "], "not-a-list", ["x" * 51])
        for tags in invalid_tags:
            with self.subTest(tags=tags):
                response = self.call("post", "/api/journal/", self.user, {**self.payload, "tags": tags}, "create")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("tags", response.data)

    def test_model_validation_rejects_malformed_tags_outside_api(self):
        for tags in ("not-a-list", ["duplicate", "duplicate"], [""], ["x" * 51]):
            entry = JournalEntry(
                user=self.user, entry_date=date(2026, 7, 14), title="Title", content="Content", tags=tags,
            )
            with self.subTest(tags=tags), self.assertRaises(DjangoValidationError):
                entry.full_clean()
