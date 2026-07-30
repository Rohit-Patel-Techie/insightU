from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.utils.timezone


def backfill_profiles(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Profile = apps.get_model("profiles", "UserProfile")
    for user in User.objects.all().iterator():
        profile, _ = Profile.objects.get_or_create(user_id=user.pk)
        days = profile.study_days or 5
        profile.study_weekdays = list(range(1, min(max(days, 1), 7) + 1))
        profile.onboarding_completed = bool(profile.course and profile.year)
        profile.save(update_fields=["study_weekdays", "onboarding_completed"])


class Migration(migrations.Migration):
    dependencies = [("profiles", "0001_initial")]
    operations = [
        migrations.AlterField(
            model_name="userprofile", name="study_hours",
            field=models.DecimalField(decimal_places=1, default=0, max_digits=3, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(8)]),
        ),
        migrations.AddField(model_name="userprofile", name="study_weekdays", field=models.JSONField(default=[1, 2, 3, 4, 5])),
        migrations.AddField(model_name="userprofile", name="timezone", field=models.CharField(default="UTC", max_length=64)),
        migrations.AddField(model_name="userprofile", name="onboarding_completed", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="userprofile", name="created_at", field=models.DateTimeField(default=django.utils.timezone.now, editable=False)),
        migrations.AddField(model_name="userprofile", name="updated_at", field=models.DateTimeField(default=django.utils.timezone.now)),
        migrations.RunPython(backfill_profiles, migrations.RunPython.noop),
    ]
