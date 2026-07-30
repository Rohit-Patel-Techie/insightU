"""Deterministic analytics services.

Each module is intentionally small and pure so that formulas stay transparent
and independently unit-testable. Component services accept normalized plain
data (see :mod:`analytics.services.normalization`) rather than ORM objects.
"""
