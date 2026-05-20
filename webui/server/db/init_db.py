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

CREATE TABLE IF NOT EXISTS sprints (
    id                      TEXT PRIMARY KEY,
    sprint_id               TEXT NOT NULL,
    game_slug               TEXT NOT NULL,
    milestone_id            TEXT,
    date                    TEXT,
    status                  TEXT DEFAULT 'planned',
    total_estimated_minutes INTEGER,
    actual_start_time       TEXT,
    actual_end_time         TEXT,
    notes                   TEXT,
    conflict_report         TEXT,
    skipped_due_to_blocker  TEXT,
    skipped_due_to_override TEXT,
    active_workers          TEXT,
    morning_report_flags    TEXT
);

CREATE TABLE IF NOT EXISTS sprint_tasks (
    id                TEXT PRIMARY KEY,
    sprint_id         TEXT NOT NULL REFERENCES sprints(id),
    task_id           TEXT NOT NULL,
    assigned_agent    TEXT,
    status            TEXT DEFAULT 'pending',
    worker_id         TEXT,
    started_at        TEXT,
    completed_at      TEXT,
    worker_started_at TEXT,
    attempt_count     INTEGER DEFAULT 0,
    pr_reference      TEXT,
    failure_reason    TEXT,
    qa_verdict        TEXT,
    qa_notes          TEXT,
    estimated_minutes INTEGER,
    actual_minutes    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sprints_game ON sprints(game_slug);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);

CREATE TABLE IF NOT EXISTS games (
    slug        TEXT PRIMARY KEY,
    name        TEXT,
    status      TEXT DEFAULT 'active',
    repo_url    TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS milestones (
    id              TEXT PRIMARY KEY,
    game_slug       TEXT NOT NULL REFERENCES games(slug),
    milestone_id    TEXT NOT NULL,
    name            TEXT,
    goal            TEXT,
    estimated_nights INTEGER,
    actual_nights   INTEGER,
    success_criteria TEXT,
    status          TEXT DEFAULT 'pending',
    critical_path   INTEGER DEFAULT 0,
    started_at      TEXT,
    completed_at    TEXT,
    notes           TEXT,
    created_at      TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id                   TEXT PRIMARY KEY,
    task_id              TEXT NOT NULL,
    game_slug            TEXT NOT NULL REFERENCES games(slug),
    milestone_id         TEXT,
    title                TEXT,
    type                 TEXT,
    description          TEXT,
    status               TEXT DEFAULT 'pending',
    assignee             TEXT,
    estimated_complexity TEXT,
    estimated_minutes    INTEGER,
    actual_minutes       INTEGER,
    depends_on           TEXT,
    pr_reference         TEXT,
    failure_reason       TEXT,
    attempt_count        INTEGER DEFAULT 0,
    metadata             TEXT,
    created_at           TEXT,
    updated_at           TEXT
);

CREATE TABLE IF NOT EXISTS blockers (
    id           TEXT PRIMARY KEY,
    blocker_id   TEXT NOT NULL,
    game_slug    TEXT,
    scope        TEXT DEFAULT 'game',
    title        TEXT,
    description  TEXT,
    type         TEXT,
    status       TEXT DEFAULT 'active',
    responsible  TEXT,
    priority     TEXT DEFAULT 'medium',
    added_by     TEXT,
    task_blocked TEXT,
    added_at     TEXT,
    resolved_at  TEXT,
    resolution   TEXT
);

CREATE TABLE IF NOT EXISTS decisions (
    id                      TEXT PRIMARY KEY,
    decision_id             TEXT NOT NULL,
    game_slug               TEXT,
    scope                   TEXT DEFAULT 'game',
    description             TEXT,
    agent                   TEXT,
    decision_text           TEXT,
    rationale               TEXT,
    alternatives_considered TEXT,
    status                  TEXT DEFAULT 'active',
    supersedes_id           TEXT,
    created_at              TEXT
);

CREATE TABLE IF NOT EXISTS human_overrides (
    id             TEXT PRIMARY KEY,
    override_id    TEXT NOT NULL,
    game_slug      TEXT,
    scope          TEXT DEFAULT 'game',
    description    TEXT,
    type           TEXT,
    requested_by   TEXT,
    request_text   TEXT,
    affected_files TEXT,
    status         TEXT DEFAULT 'active',
    applied_by     TEXT,
    supersedes_id  TEXT,
    created_at     TEXT
);

CREATE TABLE IF NOT EXISTS progress_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_slug  TEXT NOT NULL,
    task_id    TEXT,
    sprint_id  TEXT,
    agent      TEXT,
    message    TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS workers (
    id            TEXT PRIMARY KEY,
    slug          TEXT NOT NULL,
    machine_name  TEXT,
    status        TEXT DEFAULT 'active',
    last_seen_at  TEXT,
    registered_at TEXT
);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id  TEXT NOT NULL REFERENCES workers(id),
    task_id    TEXT,
    sprint_id  TEXT,
    status     TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
    id         TEXT PRIMARY KEY,
    type       TEXT,
    date       TEXT,
    game_slug  TEXT,
    content    TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_milestones_game ON milestones(game_slug);
CREATE INDEX IF NOT EXISTS idx_tasks_game ON tasks(game_slug);
CREATE INDEX IF NOT EXISTS idx_blockers_game ON blockers(game_slug);
CREATE INDEX IF NOT EXISTS idx_human_overrides_game ON human_overrides(game_slug);
CREATE INDEX IF NOT EXISTS idx_progress_log_game ON progress_log(game_slug);
"""


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.executescript(SCHEMA)
    conn.close()
