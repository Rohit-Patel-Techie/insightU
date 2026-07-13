from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class DailyCheckIn(models.Model):
    class StudyCompletion(models.TextChoices):
        COMPLETE = "complete", "Yes, completely"
        PARTIAL = "partial", "Partially"
        NOT_TODAY = "not_today", "Not today"

    class FocusLevel(models.TextChoices):
        DEEP_FOCUS = "deep_focus", "Deep Focus"
        MOSTLY_FOCUSED = "mostly_focused", "Mostly Focused"
        AVERAGE = "average", "Average"
        FREQUENTLY_DISTRACTED = "frequently_distracted", "Often Distracted"
        COULD_NOT_FOCUS = "could_not_focus", "Couldn't Focus"

    class Mood(models.TextChoices):
        EXCELLENT = "excellent", "Excellent"
        GOOD = "good", "Good"
        OKAY = "okay", "Okay"
        LOW = "low", "Low"
        STRESSED = "stressed", "Stressed"

    class DayType(models.TextChoices):
        CALM = "calm", "Calm"
        PRODUCTIVE = "productive", "Productive"
        TIRED = "tired", "Tired"
        OVERWHELMED = "overwhelmed", "Overwhelmed"
        MOTIVATED = "motivated", "Motivated"

    class DistractionTime(models.TextChoices):
        MORNING = "morning", "Morning"
        AFTERNOON = "afternoon", "Afternoon"
        EVENING = "evening", "Evening"
        NIGHT = "night", "Night"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_checkins",
    )
    check_in_date = models.DateField(default=timezone.localdate, editable=False)
    study_hours = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        validators=[MinValueValidator(0), MaxValueValidator(8)],
    )
    planned_study_status = models.CharField(max_length=20, choices=StudyCompletion.choices)
    focus_level = models.CharField(max_length=30, choices=FocusLevel.choices)
    mood = models.CharField(max_length=20, choices=Mood.choices)
    day_type = models.CharField(max_length=20, choices=DayType.choices)
    distractions = models.JSONField(default=list)
    distraction_time = models.CharField(
        max_length=20,
        choices=DistractionTime.choices,
        blank=True,
        default="",
    )
    habits_completed = models.JSONField(default=list, blank=True)
    reflection_went_well = models.CharField(max_length=150, blank=True, default="")
    reflection_improve_tomorrow = models.CharField(max_length=150, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-check_in_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "check_in_date"],
                name="unique_user_daily_checkin",
            ),
            models.CheckConstraint(
                condition=models.Q(study_hours__gte=0, study_hours__lte=8),
                name="checkin_study_hours_between_0_and_8",
            )
        ]

    def __str__(self):
        return f"{self.user} — {self.check_in_date}"
