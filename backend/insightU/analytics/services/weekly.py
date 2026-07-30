"""Week boundaries (Monday-Sunday) and per-week helpers."""
from __future__ import annotations

import datetime as _dt


def week_bounds(anchor: _dt.date) -> tuple[_dt.date, _dt.date]:
    """Return (Monday, Sunday) for the ISO week containing ``anchor``."""
    monday = anchor - _dt.timedelta(days=anchor.isoweekday() - 1)
    sunday = monday + _dt.timedelta(days=6)
    return monday, sunday


def week_days(anchor: _dt.date) -> list[_dt.date]:
    monday, _ = week_bounds(anchor)
    return [monday + _dt.timedelta(days=i) for i in range(7)]
