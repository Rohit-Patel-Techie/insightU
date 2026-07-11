from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class RegisterTests(APITestCase):
    def test_register_success(self):
        url = reverse("register")
        data = {
            "username": "shubham",
            "email": "shubham@example.com",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertTrue(User.objects.get().check_password("StrongPass123!"))

    def test_register_password_mismatch(self):
        url = reverse("register")
        data = {
            "username": "shubham",
            "email": "shubham@example.com",
            "password": "StrongPass123!",
            "password2": "DoesNotMatch123!",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email_rejected(self):
        User.objects.create_user(username="existing", email="shubham@example.com", password="pass12345")
        url = reverse("register")
        data = {
            "username": "shubham2",
            "email": "shubham@example.com",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username_rejected(self):
        User.objects.create_user(username="shubham", email="a@example.com", password="pass12345")
        url = reverse("register")
        data = {
            "username": "shubham",
            "email": "b@example.com",
            "password": "StrongPass123!",
            "password2": "StrongPass123!",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAndProtectedEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="shubham", email="shubham@example.com", password="StrongPass123!"
        )

    def test_login_success_returns_tokens_and_user(self):
        url = reverse("login")
        response = self.client.post(url, {"username": "shubham", "password": "StrongPass123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "shubham@example.com")

    def test_login_wrong_password_rejected(self):
        url = reverse("login")
        response = self.client.post(url, {"username": "shubham", "password": "WrongPassword"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_authentication(self):
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_accessible_with_valid_token(self):
        login_response = self.client.post(
            reverse("login"), {"username": "shubham", "password": "StrongPass123!"}
        )
        access_token = login_response.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get(reverse("profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "shubham")

    def test_logout_blacklists_refresh_token(self):
        login_response = self.client.post(
            reverse("login"), {"username": "shubham", "password": "StrongPass123!"}
        )
        access = login_response.data["access"]
        refresh = login_response.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        logout_response = self.client.post(reverse("logout"), {"refresh": refresh})
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        # The same refresh token should no longer work after logout.
        refresh_response = self.client.post(reverse("login-refresh"), {"refresh": refresh})
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="shubham", email="shubham@example.com", password="OldPassword123!"
        )

    def test_request_reset_sends_email(self):
        response = self.client.post(reverse("password-reset"), {"email": "shubham@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("shubham@example.com", mail.outbox[0].to)

    def test_request_reset_unknown_email_still_returns_200(self):
        response = self.client.post(reverse("password-reset"), {"email": "nobody@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_confirm_reset_with_valid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        data = {
            "uid": uid,
            "token": token,
            "new_password": "BrandNewPass456!",
            "new_password2": "BrandNewPass456!",
        }
        response = self.client.post(reverse("password-reset-confirm"), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPass456!"))

    def test_confirm_reset_with_invalid_token_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        data = {
            "uid": uid,
            "token": "invalid-token",
            "new_password": "BrandNewPass456!",
            "new_password2": "BrandNewPass456!",
        }
        response = self.client.post(reverse("password-reset-confirm"), data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)