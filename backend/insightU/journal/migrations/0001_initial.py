from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="JournalEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("entry_date", models.DateField()),
                ("title", models.CharField(max_length=200)),
                ("content", models.TextField()),
                ("tags", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="journal_entries", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ("-entry_date", "-created_at"),
                "indexes": [models.Index(fields=["user", "entry_date"], name="journal_user_date_idx")],
            },
        ),
    ]
