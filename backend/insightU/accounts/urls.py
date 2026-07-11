from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="login-refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset-confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
]