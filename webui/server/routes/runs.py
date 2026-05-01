from fastapi import APIRouter, HTTPException
from webui.server import config as cfg
import sqlite3, uuid, datetime, sys, os

router = APIRouter(tags=["runs"])

def _db():
    conn = sqlite3.connect(str(cfg.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def _script_cmd(name: str):
    """Returns command list to run a .sh script cross-platform."""
    script = str(cfg.REPO_ROOT / "scripts" / name)
    if sys.platform == "win32":
        # Try bash (Git Bash / WSL)
        bash = "bash"
        return [bash, script]
    return [script]

def _save_run(run_id, game, script, pid):
    with _db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO runs (run_id, game, script, status, started_at, pid) VALUES (?,?,?,?,?,?)",
            (run_id, game, script, "running", datetime.datetime.utcnow().isoformat(), pid)
        )

@router.get("/")
async def list_runs():
    try:
        with _db() as conn:
            rows = conn.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT 50").fetchall()
            return [dict(r) for r in rows]
    except Exception: return []

@router.get("/{run_id}")
async def get_run(run_id: str):
    try:
        from webui.server.services.process import process_manager
        logs = process_manager.tail(run_id, 200)
        alive = process_manager.is_running(run_id)
    except Exception:
        logs, alive = [], False
    with _db() as conn:
        row = conn.execute("SELECT * FROM runs WHERE run_id=?", (run_id,)).fetchone()
    if not row:
        raise HTTPException(404)
    return {**dict(row), "logs": logs, "is_alive": alive}

@router.get("/{run_id}/logs")
async def get_logs(run_id: str, n: int = 200):
    try:
        from webui.server.services.process import process_manager
        return {"logs": process_manager.tail(run_id, n)}
    except Exception:
        return {"logs": []}

@router.post("/night-cycle/{game}")
async def launch_night_cycle(game: str):
    run_id = str(uuid.uuid4())
    try:
        from webui.server.services.process import process_manager
        cmd = _script_cmd("launch-night-cycle.sh")
        proc = process_manager.launch(cmd[0], cmd[1:] + [game], run_id)
        _save_run(run_id, game, "launch-night-cycle.sh", getattr(proc, 'pid', 0))
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"run_id": run_id}

@router.post("/architect/{game}")
async def launch_architect(game: str):
    run_id = str(uuid.uuid4())
    try:
        from webui.server.services.process import process_manager
        cmd = _script_cmd("run-architect.sh")
        proc = process_manager.launch(cmd[0], cmd[1:] + [game], run_id)
        _save_run(run_id, game, "run-architect.sh", getattr(proc, 'pid', 0))
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"run_id": run_id}

@router.post("/morning-report")
async def launch_morning_report():
    run_id = str(uuid.uuid4())
    try:
        from webui.server.services.process import process_manager
        cmd = _script_cmd("launch-morning-report.sh")
        proc = process_manager.launch(cmd[0], cmd[1:], run_id)
        _save_run(run_id, "system", "launch-morning-report.sh", getattr(proc, 'pid', 0))
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"run_id": run_id}

@router.post("/worker/{game}")
async def launch_worker(game: str, body: dict = {}):
    run_id = str(uuid.uuid4())
    try:
        from webui.server.services.process import process_manager
        cmd = _script_cmd("launch-worker.sh")
        args = cmd[1:] + [game]
        if body.get("worker_id"):
            args += [body["worker_id"]]
        proc = process_manager.launch(cmd[0], args, run_id)
        _save_run(run_id, game, "launch-worker.sh", getattr(proc, 'pid', 0))
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"run_id": run_id}

@router.delete("/{run_id}")
async def kill_run(run_id: str):
    try:
        from webui.server.services.process import process_manager
        killed = process_manager.kill(run_id)
        if killed:
            with _db() as conn:
                conn.execute("UPDATE runs SET status='killed' WHERE run_id=?", (run_id,))
        return {"killed": killed}
    except Exception as e:
        raise HTTPException(500, str(e))
