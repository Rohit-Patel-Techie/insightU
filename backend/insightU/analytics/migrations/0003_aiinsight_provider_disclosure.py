from django.db import migrations, models


def clear_unattributed_insight_cache(apps, schema_editor):
    """Derived cache is regenerable; pre-snapshot rows cannot be attributed safely."""
    apps.get_model("analytics", "AIInsight").objects.all().delete()
    apps.get_model("analytics", "AIReflection").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("analytics", "0002_aigenerationattempt_aiinsight")]

    operations = [
        migrations.AddField(
            model_name="aiinsight",
            name="provider_disclosure",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="aireflection",
            name="provider_disclosure",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(clear_unattributed_insight_cache, migrations.RunPython.noop),
    ]
