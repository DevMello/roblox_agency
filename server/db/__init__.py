"""Database helpers — thin sqlite3 connection factory."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Generator

from webui.server import config


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(str(config.DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
