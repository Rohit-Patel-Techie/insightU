from django.db import migrations
from django.utils.text import slugify


HABIT_MAP = {
    "daily study": ("study", "Daily Study", "academics", "📚"),
    "study": ("study", "Daily Study", "academics", "📚"),
    "exercise": ("exercise", "Exercise", "other", "🏃"),
    "drink water": ("drink_water", "Drink Water", "other", "💧"),
    "drink_water": ("drink_water", "Drink Water", "other", "💧"),
    "better sleep": ("sleep_before_11", "Sleep Before 11 PM", "other", "🌙"),
    "sleep before 11 pm": ("sleep_before_11", "Sleep Before 11 PM", "other", "🌙"),
    "sleep_before_11": ("sleep_before_11", "Sleep Before 11 PM", "other", "🌙"),
    "less screen time": ("less_screen_time", "Less Screen Time", "other", "📵"),
    "meditation": ("meditation", "Meditation", "other", "🧘"),
    "coding practice": ("coding_practice", "Coding Practice", "programming", "💻"),
    "reading": ("read_book", "Reading", "reading", "📖"),
    "read book": ("read_book", "Reading", "reading", "📖"),
    "read_book": ("read_book", "Reading", "reading", "📖"),
    "journal": ("journal", "Journal", "other", "📝"),
}


def habit_spec(raw):
    key = str(raw or "").strip().lower()
    if key in HABIT_MAP:
        return HABIT_MAP[key]
    code = slugify(key).replace("-", "_") or "habit"
    return code[:80], str(raw).strip()[:120] or "Habit", "other", ""


def migrate_legacy(apps, schema_editor):
    Profile = apps.get_model("profiles", "UserProfile")
    Habit = apps.get_model("habits", "Habit")
    Completion = apps.get_model("habits", "HabitCompletion")
    Goal = apps.get_model("goals", "Goal")
    CheckIn = apps.get_model("checkin", "DailyCheckIn")

    for profile in Profile.objects.all().iterator():
        weekdays = profile.study_weekdays or [1, 2, 3, 4, 5]
        for raw in profile.habits or []:
            code, name, category, icon = habit_spec(raw)
            Habit.objects.update_or_create(
                user_id=profile.user_id, code=code,
                defaults={"name": name, "category": category, "icon": icon, "schedule_weekdays": weekdays, "active": True, "source": "migrated"},
            )
        for raw in profile.goals or []:
            if isinstance(raw, dict):
                title = str(raw.get("title") or raw.get("name") or "").strip()
                category = raw.get("category", "other")
                priority = raw.get("priority", "medium")
            else:
                title, category, priority = str(raw).strip(), "other", "medium"
            if title:
                Goal.objects.get_or_create(
                    user_id=profile.user_id, title=title[:200], start_date=profile.created_at.date(),
                    defaults={"category": category if category in {"programming", "academics", "exam_prep", "project", "career", "reading", "other"} else "other", "priority": priority if priority in {"low", "medium", "high"} else "medium", "status": "active"},
                )

    for check_in in CheckIn.objects.all().iterator():
        try:
            profile = Profile.objects.get(user_id=check_in.user_id)
            weekdays = profile.study_weekdays or [1, 2, 3, 4, 5]
        except Profile.DoesNotExist:
            weekdays = [1, 2, 3, 4, 5, 6, 7]
        for raw in check_in.habits_completed or []:
            code, name, category, icon = habit_spec(raw)
            habit, _ = Habit.objects.update_or_create(
                user_id=check_in.user_id, code=code,
                defaults={"name": name, "category": category, "icon": icon, "schedule_weekdays": weekdays, "active": True, "source": "migrated"},
            )
            Completion.objects.update_or_create(
                habit_id=habit.pk, date=check_in.check_in_date,
                defaults={"user_id": check_in.user_id, "completed": True, "source": "migrated", "check_in_id": check_in.pk},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0002_analytics_profile_fields"),
        ("checkin", "0002_dailycheckin_study_category"),
        ("habits", "0001_initial"),
        ("goals", "0001_initial"),
    ]
    operations = [migrations.RunPython(migrate_legacy, migrations.RunPython.noop)]
