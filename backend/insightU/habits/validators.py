from django.core.exceptions import ValidationError


def validate_schedule_weekdays(value):
    if not isinstance(value, list):
        raise ValidationError("Schedule weekdays must be a list.")
    if any(isinstance(day, bool) or not isinstance(day, int) for day in value):
        raise ValidationError("Schedule weekdays must contain integers from 1 to 7.")
    if any(day < 1 or day > 7 for day in value):
        raise ValidationError("Schedule weekdays must contain integers from 1 to 7.")
    if len(value) != len(set(value)):
        raise ValidationError("Schedule weekdays cannot contain duplicates.")
