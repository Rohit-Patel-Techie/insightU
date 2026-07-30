from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .validators import validate_schedule_weekdays


class StudyCategory(models.TextChoices):
    PROGRAMMING = "programming", "Programming"
    ACADEMICS = "academics", "Academics"
    EXAM_PREP = "exam_prep", "Exam preparation"
    PROJECT = "project", "Project"
    CAREER = "career", "Career"
    READING = "reading", "Reading"
    OTHER = "other", "Other"


class Habit(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        PROFILE = "profile", "Profile"
        MIGRATED = "migrated", "Migrated"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="habits_rel",
    )
    name = models.CharField(max_length=120)
    code = models.SlugField(max_length=80)
    category = models.CharField(
        max_length=20,
        choices=StudyCategory.choices,
        default=StudyCategory.OTHER,
    )
    icon = models.CharField(max_length=80, blank=True, default="")
    schedule_weekdays = models.JSONField(
        default=list,
        validators=[validate_schedule_weekdays],
    )
    active = models.BooleanField(default=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name", "id")
        constraints = (
            models.UniqueConstraint(fields=("user", "code"), name="unique_user_habit_code"),
        )

    def __str__(self):
        return f"{self.user} — {self.name}"


class HabitCompletion(models.Model):
    class Source(models.TextChoices):
        CHECKIN = "checkin", "Check-in"
        MANUAL = "manual", "Manual"
        MIGRATED = "migrated", "Migrated"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="habit_completions",
    )
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="completions")
    date = models.DateField()
    completed = models.BooleanField(default=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    check_in = models.ForeignKey(
        "checkin.DailyCheckIn",
        on_delete=models.SET_NULL,
        related_name="habit_completions",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-date", "habit_id")
        constraints = (
            models.UniqueConstraint(fields=("habit", "date"), name="unique_habit_completion_date"),
        )
        indexes = (models.Index(fields=("user", "date"), name="habitcomp_user_date_idx"),)

    def clean(self):
        errors = {}
        if self.habit_id and self.user_id and self.habit.user_id != self.user_id:
            errors["habit"] = "Habit must belong to the completion user."
        if self.check_in_id and self.user_id and self.check_in.user_id != self.user_id:
            errors["check_in"] = "Check-in must belong to the completion user."
        if self.check_in_id and self.date and self.check_in.check_in_date != self.date:
            errors["check_in"] = "Check-in date must match the completion date."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.habit} — {self.date}"
