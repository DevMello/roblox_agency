"""Runs routes — launch/kill/log agency scripts."""
from __future__ import annotations

import platform
import shutil
import sqlite3
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from webui.server import config

router = APIRouter(prefix="/api/v1/runs", tags=["runs"])

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(config.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _insert_run(run_id: str, game: str | None, script: str, pid: int) -> None:
    conn = _get_db()
    try:
        conn.execute(
            """INSERT INTO runs (id, game, script, started_at, pid, status)
               VALUES (?, ?, ?, ?, ?, 'running')""",
            (run_id, game, script, datetime.now(timezone.utc).isoformat(), pid),
        )
        conn.commit()
    finally:
        conn.close()


def _update_run_status(run_id: str, status: str, exit_code: int | None) -> None:
    conn = _get_db()
    try:
        conn.execute(
            """UPDATE runs SET status=?, ended_at=?, exit_code=? WHERE id=?""",
            (status, datetime.now(timezone.utc).isoformat(), exit_code, run_id),
        )
        conn.commit()
    finally:
        conn.close()


def _append_log(run_id: str, line: str, line_number: int) -> None:
    conn = _get_db()
    try:
        conn.execute(
            """INSERT INTO run_logs (run_id, line_number, timestamp, message)
               VALUES (?, ?, ?, ?)""",
            (run_id, line_number, datetime.now(timezone.utc).isoformat(), line.rstrip()),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Process launch helpers
# ---------------------------------------------------------------------------

def _build_cmd(script_name: str) -> list[str]:
    """Build the command list to run a .sh script."""
    script_path = str(config.REPO_ROOT / "scripts" / script_name)
    if platform.system() == "Windows":
        bash = shutil.which("bash")
        if bash:
            return [bash, script_path]
        # Fallback: try Git Bash
        git_bash = r"C:\Program Files\Git\bin\bash.exe"
        if Path(git_bash).exists():
            return [git_bash, script_path]
        # Last resort: run directly (WSL / MSYS)
        return [script_path]
    return ["bash", script_path]


def _monitor_process(proc: subprocess.Popen, run_id: str) -> None:
    """Background thread: stream stdout/stderr into run_logs, update status on exit."""
    line_number = 0
    try:
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            line_number += 1
            _append_log(run_id, raw_line, line_number)
        proc.wait()
        status = "completed" if proc.returncode == 0 else "failed"
        _update_run_status(run_id, status, proc.returncode)
    except Exception:
        _update_run_status(run_id, "failed", -1)


def _launch(script_name: str, game: str | None, extra_args: list[str] | None = None) -> dict[str, Any]:
    """Launch a script, record it in the DB, return {run_id, pid}."""
    cmd = _build_cmd(script_name)
    if extra_args:
        cmd.extend(extra_args)

    run_id = str(uuid.uuid4())
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(config.REPO_ROOT),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=f"Script not found: {exc}") from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to launch script: {exc}") from exc

    _insert_run(run_id, game, script_name, proc.pid)

    thread = threading.Thread(target=_monitor_process, args=(proc, run_id), daemon=True)
    thread.start()

    return {"run_id": run_id, "pid": proc.pid}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/")
async def list_runs() -> list[dict]:
    """Returns recent runs from SQLite runs table."""
    try:
        conn = _get_db()
        try:
            rows = conn.execute(
                "SELECT id, game, script, status, started_at, pid FROM runs ORDER BY started_at DESC LIMIT 100"
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{run_id}/logs")
async def get_logs(run_id: str, n: int = 200) -> dict:
    """Returns last n log lines from run_logs."""
    try:
        conn = _get_db()
        try:
            run = conn.execute("SELECT id FROM runs WHERE id=?", (run_id,)).fetchone()
            if not run:
                raise HTTPException(status_code=404, detail="Run not found")
            rows = conn.execute(
                """SELECT line_number, timestamp, message
                   FROM run_logs WHERE run_id=?
                   ORDER BY line_number DESC LIMIT ?""",
                (run_id, n),
            ).fetchall()
            lines = [dict(r) for r in reversed(rows)]
            return {"run_id": run_id, "lines": lines}
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{run_id}")
async def get_run(run_id: str) -> dict:
    """Returns run details + last 200 log lines."""
    try:
        conn = _get_db()
        try:
            row = conn.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Run not found")
            run = dict(row)
            log_rows = conn.execute(
                """SELECT line_number, timestamp, message
                   FROM run_logs WHERE run_id=?
                   ORDER BY line_number DESC LIMIT 200""",
                (run_id,),
            ).fetchall()
            run["logs"] = [dict(r) for r in reversed(log_rows)]
            return run
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/night-cycle/{game}")
async def launch_night_cycle(game: str) -> dict:
    """Launches scripts/launch-night-cycle.sh with game as argument."""
    return _launch("launch-night-cycle.sh", game, [game])


@router.post("/architect/{game}")
async def launch_architect(game: str) -> dict:
    """Launches scripts/run-architect.sh."""
    return _launch("run-architect.sh", game, [game])


@router.post("/morning-report")
async def launch_morning_report() -> dict:
    """Launches scripts/launch-morning-report.sh."""
    return _launch("launch-morning-report.sh", None)


@router.post("/worker/{game}")
async def launch_worker(game: str, body: dict = {}) -> dict:
    """Launches scripts/launch-worker.sh. Body: {worker_id: optional str}"""
    extra: list[str] = [game]
    worker_id = body.get("worker_id")
    if worker_id:
        extra.append(str(worker_id))
    return _launch("launch-worker.sh", game, extra)


@router.delete("/{run_id}")
async def kill_run(run_id: str) -> dict:
    """Sends SIGTERM to the process."""
    import signal
    import os

    try:
        conn = _get_db()
        try:
            row = conn.execute("SELECT pid, status FROM runs WHERE id=?", (run_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Run not found")
            if row["status"] not in ("running", "pending"):
                return {"killed": False, "reason": f"Run is already {row['status']}"}
            pid = row["pid"]
        finally:
            conn.close()

        try:
            if platform.system() == "Windows":
                subprocess.run(["taskkill", "/PID", str(pid), "/F"], check=False)
            else:
                os.kill(pid, signal.SIGTERM)
            _update_run_status(run_id, "killed", None)
            return {"killed": True}
        except (ProcessLookupError, PermissionError) as exc:
            return {"killed": False, "reason": str(exc)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
