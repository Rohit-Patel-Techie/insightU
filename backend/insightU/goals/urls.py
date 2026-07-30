from rest_framework.routers import DefaultRouter

from .views import GoalViewSet

app_name = "goals"
router = DefaultRouter()
router.register("", GoalViewSet, basename="goal")
urlpatterns = router.urls
