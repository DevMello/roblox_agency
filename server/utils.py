"""Shared utilities for server routes and models."""
from __future__ import annotations

import datetime


def now() -> str:
    """Return current UTC time as an ISO 8601 string."""
    return datetime.datetime.utcnow().isoformat()
