from django.urls import path
from .views import UserProfileView

urlpatterns = [
    path('profile/me', UserProfileView.as_view(), name='user-profile'),

]