from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError


def validate_iana_timezone(value):
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError, TypeError) as exc:
        raise ValidationError("Enter a valid IANA timezone, such as Asia/Kolkata.") from exc


def validate_iso_weekdays(value):
    if not isinstance(value, list) or not value:
        raise ValidationError("Select at least one planned study weekday.")
    if any(not isinstance(day, int) or day < 1 or day > 7 for day in value):
        raise ValidationError("Weekdays must be unique integers from 1 (Monday) to 7 (Sunday).")
    if len(value) != len(set(value)):
        raise ValidationError("Weekdays cannot contain duplicates.")
