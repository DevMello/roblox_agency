from __future__ import annotations

from fastapi import APIRouter, HTTPException
import re, uuid

from server.db import get_db

router = APIRouter(tags=["edits"])


def _repo():
    from server.services.repo import repo_service
    return repo_service


@router.get("/")
async def list_edits():
    try:
        with get_db() as conn:
            rows = conn.execute(
                "SELECT id, scope, game_slug, type, requested_by, request,"
                " affected_files, status, created_at"
                " FROM human_overrides ORDER BY created_at DESC LIMIT 50"
            ).fetchall()
            return [dict(r) for r in rows]
    except Exception:
        return []

@router.post("/{game}")
async def submit_edit(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text required")
    try:
        _repo().append_override(game, text)
    except Exception as e:
        raise HTTPException(500, str(e))

    run_id = None
    if body.get("apply_immediately"):
        from server.routes.runs import _script_cmd, _save_run
        from server.services.process import process_manager
        run_id = str(uuid.uuid4())
        cmd = _script_cmd("apply-live-edit.sh")
        proc = process_manager.launch(cmd[0], cmd[1:] + [game], run_id)
        _save_run(run_id, game, "apply-live-edit.sh", getattr(proc, 'pid', 0))

    return {"saved": True, "run_id": run_id}

@router.get("/history/{game}")
async def edit_history(game: str):
    entries: list[str] = []
    for path in [f"games/{game}/memory/human-overrides.md", "memory/human-overrides.md"]:
        try:
            content = _repo().read_file(path)
            sections = re.split(r'(?=^## )', content, flags=re.MULTILINE)
            entries += [s.strip() for s in sections if game.lower() in s.lower() and s.strip()]
        except Exception:
            pass
    return {"entries": entries}
