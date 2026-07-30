"""Deterministic trend detection.

Requires >= TREND_MIN_POINTS reported points. Compares the average of the first
half against the second half; relative change > +5% is increasing, < -5% is
decreasing, otherwise stable.
"""
from __future__ import annotations

from typing import Sequence

from .constants import (
    TREND_DECREASING_THRESHOLD,
    TREND_INCREASING_THRESHOLD,
    TREND_MIN_POINTS,
)


def trend(values: Sequence[float]) -> dict:
    points = [v for v in values if v is not None]
    n = len(points)
    if n < TREND_MIN_POINTS:
        return {
            "available": False,
            "direction": "insufficient_data",
            "points": n,
            "min_points": TREND_MIN_POINTS,
        }
    mid = n // 2
    first = points[:mid]
    second = points[mid:]
    first_avg = sum(first) / len(first)
    second_avg = sum(second) / len(second)
    if first_avg == 0:
        change = 0.0 if second_avg == 0 else 1.0
    else:
        change = (second_avg - first_avg) / abs(first_avg)
    if change > TREND_INCREASING_THRESHOLD:
        direction = "increasing"
    elif change < TREND_DECREASING_THRESHOLD:
        direction = "decreasing"
    else:
        direction = "stable"
    return {
        "available": True,
        "direction": direction,
        "points": n,
        "first_half_avg": first_avg,
        "second_half_avg": second_avg,
        "change_pct": change,
    }
