from rest_framework.routers import DefaultRouter

from .views import DailyCheckInViewSet

app_name = "checkin"

router = DefaultRouter()
router.register("", DailyCheckInViewSet, basename="checkin")

urlpatterns = router.urls
