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

-- Games registry
CREATE TABLE IF NOT EXISTS games (
    slug        TEXT PRIMARY KEY,
    name        TEXT,
    repo_url    TEXT,
    status      TEXT DEFAULT 'active',
    created_at  TEXT
);

-- Milestones (from plan.md)
CREATE TABLE IF NOT EXISTS milestones (
    id                TEXT PRIMARY KEY,
    game_slug         TEXT NOT NULL,
    title             TEXT,
    goal              TEXT,
    status            TEXT DEFAULT 'pending',
    estimated_nights  INTEGER,
    actual_nights     INTEGER,
    completed_at      TEXT,
    created_at        TEXT,
    FOREIGN KEY(game_slug) REFERENCES games(slug)
);

-- Plan tasks (canonical task definitions)
CREATE TABLE IF NOT EXISTS tasks (
    task_id              TEXT PRIMARY KEY,
    game_slug            TEXT NOT NULL,
    milestone_id         TEXT,
    title                TEXT,
    type                 TEXT,
    description          TEXT,
    estimated_complexity TEXT,
    estimated_minutes    INTEGER,
    actual_minutes       INTEGER,
    assignee             TEXT,
    status               TEXT DEFAULT 'pending',
    pr_reference         TEXT,
    ambiguity_notes      TEXT,
    failure_reason       TEXT,
    created_at           TEXT,
    FOREIGN KEY(game_slug) REFERENCES games(slug)
);

-- Task dependency graph
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id             TEXT NOT NULL,
    depends_on_task_id  TEXT NOT NULL,
    dependency_type     TEXT DEFAULT 'hard',
    PRIMARY KEY(task_id, depends_on_task_id)
);

-- Nightly sprint records
CREATE TABLE IF NOT EXISTS sprints (
    sprint_id                TEXT PRIMARY KEY,
    game_slug                TEXT,
    date                     TEXT,
    milestone_ref            TEXT,
    status                   TEXT DEFAULT 'planned',
    total_estimated_minutes  INTEGER,
    actual_start_time        TEXT,
    actual_end_time          TEXT,
    active_workers           TEXT,
    skipped_due_to_blocker   TEXT,
    skipped_due_to_override  TEXT,
    conflict_report          TEXT,
    notes                    TEXT
);

-- Sprint task snapshots (execution copies of tasks)
CREATE TABLE IF NOT EXISTS sprint_tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id         TEXT NOT NULL,
    task_id           TEXT NOT NULL,
    title             TEXT,
    type              TEXT,
    description       TEXT,
    estimated_minutes INTEGER,
    actual_minutes    INTEGER,
    assigned_agent    TEXT,
    depends_on        TEXT,
    status            TEXT DEFAULT 'pending',
    started_at        TEXT,
    worker_started_at TEXT,
    completed_at      TEXT,
    pr_reference      TEXT,
    failure_reason    TEXT,
    attempt_count     INTEGER DEFAULT 0,
    qa_verdict        TEXT DEFAULT 'pending',
    qa_notes          TEXT,
    worker_id         TEXT,
    FOREIGN KEY(sprint_id) REFERENCES sprints(sprint_id)
);

-- Append-only build log
CREATE TABLE IF NOT EXISTS progress_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    game_slug   TEXT NOT NULL,
    agent       TEXT,
    task_id     TEXT,
    message     TEXT,
    created_at  TEXT
);

-- Blockers (agency-level and game-level combined)
CREATE TABLE IF NOT EXISTS blockers (
    id            TEXT PRIMARY KEY,
    scope         TEXT DEFAULT 'game',
    game_slug     TEXT,
    task_blocked  TEXT,
    description   TEXT,
    type          TEXT,
    responsible   TEXT,
    priority      TEXT DEFAULT 'medium',
    added_by      TEXT,
    status        TEXT DEFAULT 'open',
    resolved_at   TEXT,
    resolution    TEXT,
    created_at    TEXT
);

-- Architectural decisions
CREATE TABLE IF NOT EXISTS decisions (
    id           TEXT PRIMARY KEY,
    scope        TEXT DEFAULT 'game',
    game_slug    TEXT,
    agent        TEXT,
    decision     TEXT,
    rationale    TEXT,
    alternatives TEXT,
    status       TEXT DEFAULT 'active',
    created_at   TEXT
);

-- Human override log (append-only)
CREATE TABLE IF NOT EXISTS human_overrides (
    id             TEXT PRIMARY KEY,
    scope          TEXT DEFAULT 'game',
    game_slug      TEXT,
    type           TEXT,
    requested_by   TEXT,
    request        TEXT,
    affected_files TEXT,
    status         TEXT DEFAULT 'active',
    applied_by     TEXT,
    supersedes     TEXT,
    created_at     TEXT
);

-- Worker machine registry
CREATE TABLE IF NOT EXISTS workers (
    id            TEXT PRIMARY KEY,
    slug          TEXT UNIQUE NOT NULL,
    machine_name  TEXT,
    status        TEXT DEFAULT 'active',
    last_seen_at  TEXT,
    registered_at TEXT
);

-- Worker heartbeat log
CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id   TEXT NOT NULL,
    task_id     TEXT,
    sprint_id   TEXT,
    status      TEXT,
    created_at  TEXT,
    FOREIGN KEY(worker_id) REFERENCES workers(id)
);

-- Morning and weekly report storage
CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    type        TEXT,
    report_date TEXT,
    game_slug   TEXT,
    title       TEXT,
    content     TEXT,
    metrics     TEXT,
    created_at  TEXT
);

-- Game spec content
CREATE TABLE IF NOT EXISTS specs (
    game_slug             TEXT PRIMARY KEY,
    content               TEXT,
    genre                 TEXT,
    target_age_range      TEXT,
    target_session_length TEXT,
    primary_monetisation  TEXT,
    max_players           INTEGER,
    fps_target            INTEGER,
    platforms             TEXT,
    updated_at            TEXT
);

-- Game state snapshot (computed by Planner/Architect)
CREATE TABLE IF NOT EXISTS game_state (
    game_slug                TEXT PRIMARY KEY,
    phase                    TEXT,
    active_milestone         TEXT,
    nights_elapsed           INTEGER,
    estimated_nights_to_mvp  INTEGER,
    tasks_total              INTEGER,
    tasks_done               INTEGER,
    tasks_pending            INTEGER,
    tasks_failed             INTEGER,
    tasks_blocked            INTEGER,
    open_questions           TEXT,
    updated_at               TEXT
);

-- Weekly market research and game idea reports
CREATE TABLE IF NOT EXISTS weekly_reports (
    id          TEXT PRIMARY KEY,
    week        TEXT,
    type        TEXT,
    content     TEXT,
    created_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_game          ON tasks(game_slug);
CREATE INDEX IF NOT EXISTS idx_sprint_tasks_sprint ON sprint_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_progress_game       ON progress_log(game_slug);
CREATE INDEX IF NOT EXISTS idx_blockers_game       ON blockers(game_slug);
CREATE INDEX IF NOT EXISTS idx_reports_type_date   ON reports(type, report_date);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats   ON worker_heartbeats(worker_id);
"""


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA)
        # Idempotent migrations for columns added after initial release
        for migration in (
            "ALTER TABLE sprints ADD COLUMN notes TEXT",
        ):
            try:
                conn.execute(migration)
            except sqlite3.OperationalError:
                pass
