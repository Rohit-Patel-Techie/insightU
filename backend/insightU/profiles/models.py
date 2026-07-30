from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .validators import validate_iana_timezone, validate_iso_weekdays


def default_study_weekdays():
    return [1, 2, 3, 4, 5]


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    avatar = models.CharField(max_length=10, blank=True, null=True)
    course = models.CharField(max_length=100, blank=True, null=True)
    year = models.CharField(max_length=10, blank=True, null=True)
    goals = models.JSONField(default=list, blank=True, help_text="Legacy onboarding data; use goals.Goal for new records.")
    study_time = models.CharField(max_length=50, blank=True, null=True)
    study_hours = models.DecimalField(max_digits=3, decimal_places=1, default=0, validators=[MinValueValidator(0), MaxValueValidator(8)])
    study_days = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(7)])
    study_weekdays = models.JSONField(default=default_study_weekdays, validators=[validate_iso_weekdays])
    challenges = models.JSONField(default=list, blank=True)
    habits = models.JSONField(default=list, blank=True, help_text="Legacy onboarding data; use habits.Habit for new records.")
    motivation = models.TextField(max_length=200, blank=True, null=True)
    timezone = models.CharField(max_length=64, default="UTC", validators=[validate_iana_timezone])
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.study_weekdays:
            self.study_days = len(set(self.study_weekdays))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username}'s Profile"
