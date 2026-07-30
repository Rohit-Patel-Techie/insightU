# Generated for Django 5.2/6 compatibility.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import habits.validators


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("checkin", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Habit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("code", models.SlugField(max_length=80)),
                ("category", models.CharField(choices=[("programming", "Programming"), ("academics", "Academics"), ("exam_prep", "Exam preparation"), ("project", "Project"), ("career", "Career"), ("reading", "Reading"), ("other", "Other")], default="other", max_length=20)),
                ("icon", models.CharField(blank=True, default="", max_length=80)),
                ("schedule_weekdays", models.JSONField(default=list, validators=[habits.validators.validate_schedule_weekdays])),
                ("active", models.BooleanField(default=True)),
                ("source", models.CharField(choices=[("manual", "Manual"), ("profile", "Profile"), ("migrated", "Migrated")], default="manual", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="habits_rel", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("name", "id")},
        ),
        migrations.CreateModel(
            name="HabitCompletion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("completed", models.BooleanField(default=True)),
                ("source", models.CharField(choices=[("checkin", "Check-in"), ("manual", "Manual"), ("migrated", "Migrated")], default="manual", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("check_in", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="habit_completions", to="checkin.dailycheckin")),
                ("habit", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="completions", to="habits.habit")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="habit_completions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-date", "habit_id")},
        ),
        migrations.AddConstraint(
            model_name="habit",
            constraint=models.UniqueConstraint(fields=("user", "code"), name="unique_user_habit_code"),
        ),
        migrations.AddConstraint(
            model_name="habitcompletion",
            constraint=models.UniqueConstraint(fields=("habit", "date"), name="unique_habit_completion_date"),
        ),
        migrations.AddIndex(
            model_name="habitcompletion",
            index=models.Index(fields=["user", "date"], name="habitcomp_user_date_idx"),
        ),
    ]
