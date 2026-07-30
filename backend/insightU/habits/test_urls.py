from django.urls import include, path

urlpatterns = [path("api/habits/", include("habits.urls"))]
