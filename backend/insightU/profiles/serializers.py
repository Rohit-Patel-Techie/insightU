from rest_framework import serializers
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):

    # Including the user's first name and email as read-only fields
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'avatar', 'course', 'year', 
            'goals', 'study_time', 'study_hours', 'study_days', 
            'challenges', 'habits', 'motivation'
        ]