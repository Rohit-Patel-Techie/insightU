from django.urls import path

from .views import ProfileOnboardingView, UserProfileView

urlpatterns = [
    path("profile/me", UserProfileView.as_view(), name="user-profile-legacy"),
    path("profile/me/", UserProfileView.as_view(), name="user-profile"),
    path("onboarding/complete/", ProfileOnboardingView.as_view(), name="profile-onboarding"),
]
