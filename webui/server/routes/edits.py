from fastapi import APIRouter, HTTPException
import datetime

router = APIRouter(tags=["edits"])

@router.get("/")
async def list_edits():
    try:
        from webui.server import config as cfg
        import sqlite3
        with sqlite3.connect(str(cfg.DB_PATH)) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM ui_comments ORDER BY created_at DESC LIMIT 50").fetchall()
            return [dict(r) for r in rows]
    except Exception: return []

@router.post("/{game}")
async def submit_edit(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text required")
    try:
        from webui.server.services.repo import repo_service
        repo_service.append_override(game, text)
    except Exception as e:
        raise HTTPException(500, str(e))

    # Optionally launch apply-live-edit.sh
    run_id = None
    if body.get("apply_immediately"):
        import uuid
        from webui.server.routes.runs import _script_cmd, _save_run
        from webui.server.services.process import process_manager
        run_id = str(uuid.uuid4())
        cmd = _script_cmd("apply-live-edit.sh")
        proc = process_manager.launch(cmd[0], cmd[1:] + [game], run_id)
        _save_run(run_id, game, "apply-live-edit.sh", getattr(proc, 'pid', 0))

    return {"saved": True, "run_id": run_id}

@router.get("/history/{game}")
async def edit_history(game: str):
    try:
        from webui.server.services.repo import repo_service
        import re
        content = repo_service.read_file("memory/human-overrides.md")
        sections = re.split(r'(?=^## )', content, flags=re.MULTILINE)
        return {"entries": [s.strip() for s in sections if game.lower() in s.lower() and s.strip()]}
    except Exception:
        return {"entries": []}
