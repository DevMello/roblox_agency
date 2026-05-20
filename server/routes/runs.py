from fastapi import APIRouter, HTTPException
from server import config as cfg
from server.services.process import process_manager
import sqlite3, uuid, datetime, sys

router = APIRouter(tags=["runs"])

def _db():
    conn = sqlite3.connect(str(cfg.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def _script_cmd(name: str) -> list[str]:
    script = str(cfg.REPO_ROOT / "scripts" / name)
    if sys.platform == "win32":
        return ["bash", script]
    return [script]

def _save_run(run_id, game, script, pid):
    with _db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO runs (id, game, script, status, started_at, pid) VALUES (?,?,?,?,?,?)",
            (run_id, game, script, "running", datetime.datetime.utcnow().isoformat(), pid)
        )

def _launch(script: str, game: str, extra_args: list | None = None) -> str:
    run_id = str(uuid.uuid4())
    cmd = _script_cmd(script)
    args = cmd[1:] + (extra_args or [])
    proc = process_manager.launch(cmd[0], args, run_id)
    _save_run(run_id, game, script, getattr(proc, 'pid', 0))
    return run_id

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
        logs = process_manager.tail(run_id, 200)
        alive = process_manager.is_running(run_id)
    except Exception:
        logs, alive = [], False
    with _db() as conn:
        row = conn.execute("SELECT * FROM runs WHERE id=?", (run_id,)).fetchone()
    if not row:
        raise HTTPException(404)
    return {**dict(row), "logs": logs, "is_alive": alive}

@router.get("/{run_id}/logs")
async def get_logs(run_id: str, n: int = 200):
    try:
        return {"logs": process_manager.tail(run_id, n)}
    except Exception:
        return {"logs": []}

@router.post("/night-cycle/{game}")
async def launch_night_cycle(game: str):
    try:
        return {"run_id": _launch("launch-night-cycle.sh", game, [game])}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/architect/{game}")
async def launch_architect(game: str):
    try:
        return {"run_id": _launch("run-architect.sh", game, [game])}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/morning-report")
async def launch_morning_report():
    try:
        return {"run_id": _launch("launch-morning-report.sh", "system")}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/worker/{game}")
async def launch_worker(game: str, body: dict | None = None):
    extra = [game]
    if body and body.get("worker_id"):
        extra.append(body["worker_id"])
    try:
        return {"run_id": _launch("launch-worker.sh", game, extra)}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.delete("/{run_id}")
async def kill_run(run_id: str):
    try:
        killed = process_manager.kill(run_id)
        if killed:
            with _db() as conn:
                conn.execute("UPDATE runs SET status='killed' WHERE id=?", (run_id,))
        return {"killed": killed}
    except Exception as e:
        raise HTTPException(500, str(e))
