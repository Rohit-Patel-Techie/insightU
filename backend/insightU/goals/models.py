from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Goal(models.Model):
    class Category(models.TextChoices):
        PROGRAMMING = "programming", "Programming"
        ACADEMICS = "academics", "Academics"
        EXAM_PREP = "exam_prep", "Exam preparation"
        PROJECT = "project", "Project"
        CAREER = "career", "Career"
        READING = "reading", "Reading"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goals_rel",
    )
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=Category.choices)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    linked_habits = models.ManyToManyField("habits.Habit", related_name="goals", blank=True)
    start_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("status", "due_date", "-created_at")
        constraints = (
            models.CheckConstraint(
                condition=Q(due_date__isnull=True) | Q(due_date__gte=models.F("start_date")),
                name="goal_due_date_on_or_after_start",
            ),
        )

    def clean(self):
        super().clean()
        if self.due_date is not None and self.due_date < self.start_date:
            raise ValidationError({"due_date": "Due date must be on or after start date."})

    def __str__(self):
        return self.title
