from rest_framework.routers import DefaultRouter

from .views import HabitCompletionViewSet, HabitViewSet

app_name = "habits"

router = DefaultRouter()
router.register("completions", HabitCompletionViewSet, basename="completion")
router.register("", HabitViewSet, basename="habit")

urlpatterns = router.urls
