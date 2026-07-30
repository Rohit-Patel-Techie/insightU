from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone


def get_user_timezone(user):
    try:
        name = user.profile.timezone or "UTC"
        return ZoneInfo(name)
    except (AttributeError, ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def user_local_date(user, at=None):
    moment = at or timezone.now()
    if timezone.is_naive(moment):
        moment = timezone.make_aware(moment, timezone=ZoneInfo("UTC"))
    return moment.astimezone(get_user_timezone(user)).date()


def local_date_to_utc_bounds(user, local_date):
    tz = get_user_timezone(user)
    start = datetime.combine(local_date, datetime.min.time(), tzinfo=tz)
    end = datetime.combine(local_date, datetime.max.time(), tzinfo=tz)
    return start.astimezone(ZoneInfo("UTC")), end.astimezone(ZoneInfo("UTC"))
