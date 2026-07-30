from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("checkin", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name="dailycheckin", name="study_category",
            field=models.CharField(choices=[("programming", "Programming"), ("academics", "Academics"), ("exam_prep", "Exam Preparation"), ("project", "Project"), ("career", "Career"), ("reading", "Reading"), ("other", "Other")], default="other", max_length=20),
        ),
    ]
