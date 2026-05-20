from __future__ import annotations

import datetime
import re
import uuid

from fastapi import APIRouter, HTTPException

from webui.server.db import get_db
from webui.server.services.repo import repo_service

router = APIRouter(tags=["edits"])


@router.get("/")
async def list_edits():
    try:
        with get_db() as conn:
            rows = conn.execute(
                "SELECT * FROM ui_comments ORDER BY created_at DESC LIMIT 50"
            ).fetchall()
            return [dict(r) for r in rows]
    except Exception:
        return []


@router.post("/{game}")
async def submit_edit(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text required")

    now = datetime.datetime.utcnow().isoformat()
    override_id = f"override-{now[:16].replace('T', '-').replace(':', '-')}"
    row_id = str(uuid.uuid4())

    with get_db() as conn:
        conn.execute(
            """INSERT INTO human_overrides
               (id, override_id, game_slug, scope, type, requested_by, request_text, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (row_id, override_id, game, "game", "live-edit", "human", text, "active", now),
        )

    # Also write to markdown for backward compat with file-reading agents
    try:
        repo_service.append_override(game, text)
    except Exception:
        pass

    # Optionally launch apply-live-edit.sh
    run_id = None
    if body.get("apply_immediately"):
        from webui.server.routes.runs import _script_cmd, _save_run
        from webui.server.services.process import process_manager
        run_id = str(uuid.uuid4())
        cmd = _script_cmd("apply-live-edit.sh")
        proc = process_manager.launch(cmd[0], cmd[1:] + [game], run_id)
        _save_run(run_id, game, "apply-live-edit.sh", getattr(proc, "pid", 0))

    return {"saved": True, "run_id": run_id, "override_id": override_id}


@router.get("/history/{game}")
async def edit_history(game: str):
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM human_overrides
               WHERE game_slug=? ORDER BY created_at DESC""",
            (game,),
        ).fetchall()

    if rows:
        return {"entries": [dict(r) for r in rows]}

    # Fallback: markdown
    entries: list[str] = []
    for path in [f"games/{game}/memory/human-overrides.md", "memory/human-overrides.md"]:
        try:
            content = repo_service.read_file(path)
            sections = re.split(r"(?=^## )", content, flags=re.MULTILINE)
            entries += [s.strip() for s in sections if game.lower() in s.lower() and s.strip()]
        except Exception:
            pass
    return {"entries": entries}
