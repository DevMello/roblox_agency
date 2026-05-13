"""SQLite schema initialisation. Called once at server startup."""
from __future__ import annotations

import sqlite3
from pathlib import Path


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS runs (
    id          TEXT PRIMARY KEY,
    game        TEXT,
    script      TEXT,
    started_at  TEXT,
    ended_at    TEXT,
    exit_code   INTEGER,
    pid         INTEGER,
    status      TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS run_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT NOT NULL REFERENCES runs(id),
    line_number INTEGER,
    timestamp   TEXT,
    agent       TEXT,
    level       TEXT DEFAULT 'INFO',
    message     TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_logs_run_id ON run_logs(run_id);

CREATE TABLE IF NOT EXISTS schedules (
    id          TEXT PRIMARY KEY,
    label       TEXT,
    game        TEXT,
    script      TEXT,
    cron_expr   TEXT,
    timezone    TEXT DEFAULT 'America/New_York',
    active      INTEGER DEFAULT 1,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS ui_comments (
    id          TEXT PRIMARY KEY,
    run_id      TEXT,
    pr_number   INTEGER,
    file_path   TEXT,
    line        INTEGER,
    body        TEXT,
    created_at  TEXT
);
"""


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA)
    conn.close()
