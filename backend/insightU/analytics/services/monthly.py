"""Calendar-month boundaries and helpers."""
from __future__ import annotations

import calendar
import datetime as _dt


def month_bounds(year: int, month: int) -> tuple[_dt.date, _dt.date]:
    first = _dt.date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    last = _dt.date(year, month, last_day)
    return first, last


def month_bounds_for(anchor: _dt.date) -> tuple[_dt.date, _dt.date]:
    return month_bounds(anchor.year, anchor.month)


def parse_month(value: str) -> tuple[int, int]:
    """Parse a ``YYYY-MM`` string into (year, month)."""
    parts = value.split("-")
    if len(parts) != 2:
        raise ValueError("Use YYYY-MM format.")
    year, month = int(parts[0]), int(parts[1])
    if not 1 <= month <= 12:
        raise ValueError("Month must be 1-12.")
    return year, month
