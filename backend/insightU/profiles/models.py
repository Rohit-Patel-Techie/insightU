from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Basic Info
    avatar = models.CharField(max_length=10, blank=True, null=True)
    
    # Academic Info
    course = models.CharField(max_length=100, blank=True, null=True)
    year = models.CharField(max_length=10, blank=True, null=True)
    
    # Storing arrays from React as JSON
    goals = models.JSONField(default=list, blank=True)
    
    # Study Routine
    study_time = models.CharField(max_length=50, blank=True, null=True)
    study_hours = models.IntegerField(default=0)
    study_days = models.IntegerField(default=0)
    
    # Challenges & Habits (Stored as JSON arrays)
    challenges = models.JSONField(default=list, blank=True)
    habits = models.JSONField(default=list, blank=True)
    
    # Motivation
    motivation = models.TextField(max_length=200, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
