"""Edits routes — submit and retrieve human override / live-edit entries."""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from webui.server import config

router = APIRouter(prefix="/api/v1/edits", tags=["edits"])

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(config.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _insert_comment(
    run_id: str | None,
    file_path: str | None,
    body: str,
) -> str:
    comment_id = str(uuid.uuid4())
    conn = _get_db()
    try:
        conn.execute(
            """INSERT INTO ui_comments (id, run_id, file_path, body, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (comment_id, run_id, file_path, body, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()
    return comment_id


# ---------------------------------------------------------------------------
# Override-file helpers
# ---------------------------------------------------------------------------

OVERRIDES_PATH = "memory/human-overrides.md"


def _overrides_file() -> Path:
    return config.REPO_ROOT / OVERRIDES_PATH


def _append_override(game: str, text: str, target_file: str | None) -> None:
    """Append a new override entry to memory/human-overrides.md."""
    overrides = _overrides_file()
    overrides.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = [
        f"\n## [{timestamp}] {game}",
    ]
    if target_file:
        lines.append(f"**File:** `{target_file}`")
    lines.append(f"\n{text}\n")

    with overrides.open("a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def _parse_overrides_for_game(game: str) -> list[dict[str, Any]]:
    """Return override entries that mention `game` from human-overrides.md."""
    overrides = _overrides_file()
    if not overrides.exists():
        return []

    content = overrides.read_text(encoding="utf-8")
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in content.splitlines():
        if line.startswith("## ["):
            if current and (game.lower() in current.get("header", "").lower()):
                entries.append(current)
            current = {"header": line, "body": []}
        elif current is not None:
            current["body"].append(line)

    # flush last
    if current and (game.lower() in current.get("header", "").lower()):
        entries.append(current)

    # format for response
    result = []
    for entry in entries:
        result.append({
            "header": entry["header"],
            "text": "\n".join(entry["body"]).strip(),
        })
    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/")
async def list_edits() -> list[dict]:
    """Returns recent live edits from ui_comments table."""
    try:
        conn = _get_db()
        try:
            rows = conn.execute(
                "SELECT id, run_id, file_path, body, created_at FROM ui_comments ORDER BY created_at DESC LIMIT 100"
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/history/{game}")
async def edit_history(game: str) -> list[dict]:
    """Returns override entries for this game from human-overrides.md."""
    try:
        return _parse_overrides_for_game(game)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/{game}")
async def submit_edit(game: str, body: dict) -> dict:
    """
    Body: {text: str, target_file: optional str}
    Appends to memory/human-overrides.md.
    Optionally launches scripts/apply-live-edit.sh.
    Returns {saved: bool, run_id: optional str}
    """
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="'text' field is required")

    target_file: str | None = body.get("target_file")
    launch_script: bool = body.get("launch_script", False)

    try:
        _append_override(game, text, target_file)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write override: {exc}") from exc

    comment_id = _insert_comment(None, target_file, text)

    run_id: str | None = None
    if launch_script:
        try:
            from webui.server.routes.runs import _launch
            result = _launch("apply-live-edit.sh", game, [game])
            run_id = result.get("run_id")
        except Exception:
            # Non-fatal — override was already saved
            pass

    return {"saved": True, "comment_id": comment_id, "run_id": run_id}
