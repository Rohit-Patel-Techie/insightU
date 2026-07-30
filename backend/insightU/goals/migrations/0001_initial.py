from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("habits", "0001_initial"),
    ]
    operations = [
        migrations.CreateModel(
            name="Goal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("category", models.CharField(choices=[("programming", "Programming"), ("academics", "Academics"), ("exam_prep", "Exam preparation"), ("project", "Project"), ("career", "Career"), ("reading", "Reading"), ("other", "Other")], max_length=20)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")], default="medium", max_length=10)),
                ("status", models.CharField(choices=[("active", "Active"), ("completed", "Completed"), ("archived", "Archived")], default="active", max_length=10)),
                ("start_date", models.DateField()),
                ("due_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="goals_rel", to=settings.AUTH_USER_MODEL)),
                ("linked_habits", models.ManyToManyField(blank=True, related_name="goals", to="habits.habit")),
            ],
            options={
                "ordering": ("status", "due_date", "-created_at"),
                "constraints": [models.CheckConstraint(condition=models.Q(("due_date__isnull", True), ("due_date__gte", models.F("start_date")), _connector="OR"), name="goal_due_date_on_or_after_start")],
            },
        ),
    ]
