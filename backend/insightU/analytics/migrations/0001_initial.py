import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AIReflection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("version", models.CharField(default="1.0", max_length=20)),
                ("summary_hash", models.CharField(max_length=64)),
                ("content", models.TextField()),
                ("source", models.CharField(choices=[("llm", "LLM"), ("fallback", "Deterministic fallback")], default="fallback", max_length=20)),
                ("model_name", models.CharField(blank=True, default="", max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ai_reflections", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-date", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="aireflection",
            index=models.Index(fields=["user", "date"], name="analytics_a_user_id_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="aireflection",
            constraint=models.UniqueConstraint(fields=["user", "date", "version", "summary_hash"], name="unique_user_date_version_summaryhash"),
        ),
    ]
