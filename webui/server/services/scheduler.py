"""Scheduler service — APScheduler with SQLite persistence."""
from __future__ import annotations

import sqlite3
import uuid
import json
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from webui.server import config as cfg


class SchedulerService:
    def __init__(self) -> None:
        self._scheduler = BackgroundScheduler()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Load saved schedules from DB and start APScheduler."""
        self._ensure_table()
        conn = sqlite3.connect(str(cfg.DB_PATH))
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                "SELECT * FROM schedules WHERE active=1"
            ).fetchall()
        finally:
            conn.close()

        for row in rows:
            self._add_to_apscheduler(
                job_id=row["id"],
                game=row["game"],
                script=row["script"],
                cron_expr=row["cron_expr"],
            )

        self._scheduler.start()

    def shutdown(self) -> None:
        self._scheduler.shutdown(wait=False)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def add_job(self, game: str, script: str, cron: str, label: str) -> str:
        """Add cron job, save to DB, return job_id."""
        job_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        conn = sqlite3.connect(str(cfg.DB_PATH))
        try:
            conn.execute(
                """
                INSERT INTO schedules (id, label, game, script, cron_expr, active, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
                """,
                (job_id, label, game, script, cron, created_at),
            )
            conn.commit()
        finally:
            conn.close()

        self._add_to_apscheduler(job_id, game, script, cron)
        return job_id

    def remove_job(self, job_id: str) -> bool:
        """Remove from APScheduler and DB. Returns True if found."""
        conn = sqlite3.connect(str(cfg.DB_PATH))
        try:
            result = conn.execute(
                "DELETE FROM schedules WHERE id=?", (job_id,)
            )
            conn.commit()
            found = result.rowcount > 0
        finally:
            conn.close()

        if self._scheduler.get_job(job_id) is not None:
            self._scheduler.remove_job(job_id)

        return found

    def list_jobs(self) -> list[dict]:
        """Return all jobs from DB with next_run_time from APScheduler."""
        conn = sqlite3.connect(str(cfg.DB_PATH))
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute("SELECT * FROM schedules").fetchall()
        finally:
            conn.close()

        result = []
        for row in rows:
            entry = dict(row)
            apj = self._scheduler.get_job(row["id"])
            entry["next_run_time"] = (
                apj.next_run_time.isoformat() if apj and apj.next_run_time else None
            )
            result.append(entry)
        return result

    def pause_job(self, job_id: str) -> None:
        """Pause a running APScheduler job and mark inactive in DB."""
        conn = sqlite3.connect(str(cfg.DB_PATH))
        try:
            conn.execute(
                "UPDATE schedules SET active=0 WHERE id=?", (job_id,)
            )
            conn.commit()
        finally:
            conn.close()

        if self._scheduler.get_job(job_id) is not None:
            self._scheduler.pause_job(job_id)

    def resume_job(self, job_id: str) -> None:
        """Resume a paused APScheduler job and mark active in DB."""
        conn = sqlite3.connect(str(cfg.DB_PATH))
        conn.row_factory = sqlite3.Row
        try:
            conn.execute(
                "UPDATE schedules SET active=1 WHERE id=?", (job_id,)
            )
            conn.commit()
            row = conn.execute(
                "SELECT * FROM schedules WHERE id=?", (job_id,)
            ).fetchone()
        finally:
            conn.close()

        if row is None:
            return

        if self._scheduler.get_job(job_id) is not None:
            self._scheduler.resume_job(job_id)
        else:
            # Re-add if it was removed rather than paused
            self._add_to_apscheduler(
                job_id=row["id"],
                game=row["game"],
                script=row["script"],
                cron_expr=row["cron_expr"],
            )

    def next_runs(self, n: int = 10) -> list[dict]:
        """Return the next n scheduled run previews sorted by fire time."""
        previews: list[dict] = []
        for job in self._scheduler.get_jobs():
            if job.next_run_time is None:
                continue
            previews.append(
                {
                    "job_id": job.id,
                    "next_run_time": job.next_run_time.isoformat(),
                }
            )
        previews.sort(key=lambda x: x["next_run_time"])
        return previews[:n]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_table(self) -> None:
        """Create schedules and runs tables if they don't exist yet."""
        conn = sqlite3.connect(str(cfg.DB_PATH))
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS schedules (
                    id          TEXT PRIMARY KEY,
                    label       TEXT,
                    game        TEXT,
                    script      TEXT,
                    cron_expr   TEXT,
                    timezone    TEXT DEFAULT 'America/New_York',
                    active      INTEGER DEFAULT 1,
                    created_at  TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    id          TEXT PRIMARY KEY,
                    game        TEXT,
                    script      TEXT,
                    started_at  TEXT,
                    ended_at    TEXT,
                    exit_code   INTEGER,
                    pid         INTEGER,
                    status      TEXT DEFAULT 'pending'
                )
                """
            )
            conn.commit()
        finally:
            conn.close()

    def _add_to_apscheduler(
        self, job_id: str, game: str, script: str, cron_expr: str
    ) -> None:
        """Register a single job in APScheduler."""
        fields = cron_expr.split()
        if len(fields) == 5:
            minute, hour, day, month, day_of_week = fields
        else:
            # Fallback: treat as a daily job at midnight
            minute, hour, day, month, day_of_week = "0", "0", "*", "*", "*"

        trigger = CronTrigger(
            minute=minute,
            hour=hour,
            day=day,
            month=month,
            day_of_week=day_of_week,
        )

        self._scheduler.add_job(
            func=self._fire_job,
            trigger=trigger,
            id=job_id,
            replace_existing=True,
            kwargs={"game": game, "script": script},
        )

    def _fire_job(self, game: str, script: str) -> None:
        """Callback executed when a scheduled job fires."""
        run_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat()

        conn = sqlite3.connect(str(cfg.DB_PATH))
        try:
            conn.execute(
                """
                INSERT INTO runs (id, game, script, started_at, status)
                VALUES (?, ?, ?, ?, 'pending')
                """,
                (run_id, game, script, started_at),
            )
            conn.commit()
        finally:
            conn.close()

        # Delegate to process_manager if available
        try:
            from webui.server.services.process import process_manager  # type: ignore[attr-defined]

            launch = getattr(process_manager, "launch", None)
            if callable(launch):
                launch(script, [game], run_id=run_id)
        except Exception:
            pass


scheduler_service = SchedulerService()
