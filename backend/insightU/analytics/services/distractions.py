"""Distraction analytics: frequency counts only (never durations)."""
from __future__ import annotations

from collections import Counter
from typing import Iterable

from .constants import DISTRACTION_TIME_BUCKETS
from .normalization import DayRecord


def distraction_frequencies(records: Iterable[DayRecord]) -> dict:
    """Return counts of each distraction and each time-of-day bucket.

    Only frequency (how often a distraction was reported) and time-of-day are
    returned. Durations are intentionally never inferred or reported.
    """
    by_type: Counter[str] = Counter()
    by_time: Counter[str] = Counter()
    reported_days = 0
    days_with_distractions = 0
    for rec in records:
        if not rec.reported:
            continue
        reported_days += 1
        meaningful = [d for d in rec.distractions if d and d != "nothing"]
        if meaningful:
            days_with_distractions += 1
            by_type.update(meaningful)
            if rec.distraction_time in DISTRACTION_TIME_BUCKETS:
                by_time[rec.distraction_time] += 1
    return {
        "by_type": dict(by_type.most_common()),
        "by_time": {b: by_time.get(b, 0) for b in DISTRACTION_TIME_BUCKETS},
        "reported_days": reported_days,
        "days_with_distractions": days_with_distractions,
    }
