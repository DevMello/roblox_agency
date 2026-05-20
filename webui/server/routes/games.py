"""Games routes — list games, sprint log, plan, progress, overrides, blockers."""
from __future__ import annotations

import datetime
import json
import re
import uuid

from fastapi import APIRouter, HTTPException

from webui.server.db import get_db
from webui.server.services.repo import repo_service  # type: ignore[attr-defined]
from webui.server.services.markdown import markdown_service

router = APIRouter(tags=["games"])


@router.get("/")
async def list_games():
    """Returns list of Game objects as expected by the frontend."""
    try:
        from webui.server.services.git_service import git_service
        names = repo_service.game_names()
        prs = git_service.open_prs()

        result = []
        for name in names:
            try:
                state = repo_service.game_state(name)
                game_prs = [
                    pr for pr in prs
                    if name in (pr.get("headRefName") or "").lower()
                    or name in (pr.get("title") or "").lower()
                ]
                state["open_pr_count"] = len(game_prs)
                result.append(state)
            except Exception as e:
                result.append({"name": name, "slug": name, "error": str(e)})
        return result
    except Exception:
        return []


@router.get("/{game}")
async def get_game(game: str):
    try:
        from webui.server.services.git_service import git_service
        state = repo_service.game_state(game)
        prs = git_service.open_prs()
        game_prs = [
            pr for pr in prs
            if game in (pr.get("headRefName") or "").lower()
            or game in (pr.get("title") or "").lower()
        ]
        state["open_pr_count"] = len(game_prs)
        return state
    except FileNotFoundError:
        raise HTTPException(404, f"Game '{game}' not found")


@router.get("/{game}/sprint-log")
async def get_sprint_log(game: str):
    """Return structured sprint log data — DB first, markdown fallback."""
    with get_db() as conn:
        sprint_row = conn.execute(
            "SELECT * FROM sprints WHERE game_slug=? ORDER BY date DESC LIMIT 1",
            (game,),
        ).fetchone()
        task_rows = (
            conn.execute(
                "SELECT * FROM sprint_tasks WHERE sprint_id=? ORDER BY rowid",
                (sprint_row["id"],),
            ).fetchall()
            if sprint_row
            else []
        )

    if sprint_row:
        sprint = dict(sprint_row)
        for col in ("notes", "conflict_report", "skipped_due_to_blocker",
                    "skipped_due_to_override", "active_workers", "morning_report_flags"):
            try:
                sprint[col] = json.loads(sprint[col]) if sprint[col] else []
            except Exception:
                sprint[col] = sprint[col] or []
        tasks = []
        for t in task_rows:
            td = dict(t)
            try:
                td["depends_on"] = json.loads(td.get("depends_on") or "[]")
            except Exception:
                td["depends_on"] = []
            tasks.append(td)
        sprint["task_list"] = tasks
        sprint["tasks"] = tasks
        return sprint

    # Fallback: read from markdown
    try:
        content = repo_service.read_file(f"games/{game}/sprint-log.md")
        parsed = markdown_service.parse_sprint_log(content)
        parsed["raw"] = content
        return parsed
    except FileNotFoundError:
        raise HTTPException(404)


@router.post("/{game}/sprint-log")
async def create_sprint(game: str, body: dict):
    """Agents POST a full sprint object. Inserts into sprints + sprint_tasks tables."""
    sprint_id_val = (
        body.get("sprint_id")
        or f"{game}-{body.get('date', datetime.date.today().isoformat())}"
    )
    row_id = str(uuid.uuid4())

    with get_db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sprints
            (id, sprint_id, game_slug, milestone_id, date, status, total_estimated_minutes,
             actual_start_time, actual_end_time, notes, conflict_report,
             skipped_due_to_blocker, skipped_due_to_override, active_workers, morning_report_flags)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                row_id, sprint_id_val, game,
                body.get("milestone_ref") or body.get("milestone_id"),
                body.get("date"), body.get("status", "planned"),
                body.get("total_estimated_minutes"),
                body.get("actual_start_time"), body.get("actual_end_time"),
                json.dumps(body.get("notes") or []),
                json.dumps(body.get("conflict_report") or {}),
                json.dumps(body.get("skipped_due_to_blocker") or []),
                json.dumps(body.get("skipped_due_to_override") or []),
                json.dumps(body.get("active_workers") or []),
                json.dumps(body.get("morning_report_flags") or []),
            ),
        )
        for task in body.get("task_list", []):
            conn.execute(
                """
                INSERT OR REPLACE INTO sprint_tasks
                (id, sprint_id, task_id, assigned_agent, status, worker_id,
                 started_at, completed_at, worker_started_at, attempt_count,
                 pr_reference, failure_reason, qa_verdict, qa_notes,
                 estimated_minutes, actual_minutes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    str(uuid.uuid4()), row_id,
                    task.get("task_id"), task.get("assigned_agent"),
                    task.get("status", "pending"), task.get("worker_id"),
                    task.get("started_at"), task.get("completed_at"),
                    task.get("worker_started_at"), task.get("attempt_count", 0),
                    task.get("pr_reference"), task.get("failure_reason"),
                    task.get("qa_verdict"), task.get("qa_notes"),
                    task.get("estimated_minutes"), task.get("actual_minutes"),
                ),
            )
    return {"id": row_id, "sprint_id": sprint_id_val}


@router.patch("/{game}/sprint-log/{sprint_id}/tasks/{task_id}")
async def update_sprint_task(game: str, sprint_id: str, task_id: str, body: dict):
    """Builder PATCHes a task's status, timestamps, pr_reference, qa fields, etc."""
    allowed = {
        "status", "started_at", "completed_at", "worker_started_at",
        "attempt_count", "pr_reference", "failure_reason",
        "qa_verdict", "qa_notes", "actual_minutes", "worker_id",
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "No valid fields to update")

    set_clause = ", ".join(f"{k}=?" for k in updates)
    values = list(updates.values())

    with get_db() as conn:
        sprint_row = conn.execute(
            "SELECT id FROM sprints WHERE sprint_id=? AND game_slug=?",
            (sprint_id, game),
        ).fetchone()
        if not sprint_row:
            raise HTTPException(404, "Sprint not found")
        result = conn.execute(
            f"UPDATE sprint_tasks SET {set_clause} WHERE sprint_id=? AND task_id=?",
            values + [sprint_row["id"], task_id],
        )
        if result.rowcount == 0:
            raise HTTPException(404, "Task not found in sprint")
    return {"updated": True}


@router.get("/{game}/plan")
async def get_plan(game: str):
    """Return structured plan data parsed from plan.md."""
    try:
        content = repo_service.read_file(f"games/{game}/plan.md")
        parsed = markdown_service.parse_plan(content)
        parsed["raw"] = content
        return parsed
    except FileNotFoundError:
        raise HTTPException(404)


@router.get("/{game}/progress")
async def get_progress(game: str):
    """Return progress log entries — DB first, markdown fallback."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM progress_log WHERE game_slug=? ORDER BY created_at DESC",
            (game,),
        ).fetchall()

    if rows:
        return {"entries": [dict(r) for r in rows]}

    # Fallback: markdown
    try:
        content = repo_service.read_file(f"games/{game}/progress.md")
        entries = markdown_service.parse_progress_log(content)
        return {"entries": entries, "raw": content}
    except FileNotFoundError:
        raise HTTPException(404)


@router.post("/{game}/progress")
async def add_progress(game: str, body: dict):
    """Builder POSTs a progress log entry after completing a task."""
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(400, "message is required")

    now = datetime.datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO progress_log (game_slug, task_id, sprint_id, agent, message, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                game,
                body.get("task_id"),
                body.get("sprint_id"),
                body.get("agent", "builder"),
                message,
                now,
            ),
        )
    return {"saved": True, "created_at": now}


@router.get("/{game}/overrides")
async def get_overrides(game: str):
    """Return overrides — DB first (game-scoped + agency), markdown fallback."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM human_overrides
               WHERE game_slug=? OR scope='agency'
               ORDER BY created_at DESC""",
            (game,),
        ).fetchall()

    if rows:
        return {"entries": [dict(r) for r in rows], "filtered": True}

    # Fallback: markdown
    combined_entries: list = []
    combined_raw = ""

    try:
        game_content = repo_service.read_file(f"games/{game}/memory/human-overrides.md")
        combined_entries += markdown_service.parse_overrides(game_content)
        combined_raw += game_content
    except FileNotFoundError:
        pass

    try:
        agency_content = repo_service.read_file("memory/human-overrides.md")
        agency_entries = markdown_service.parse_overrides(agency_content, game_filter=game)
        combined_entries += agency_entries
        if agency_entries:
            combined_raw += "\n" + agency_content
    except FileNotFoundError:
        pass

    return {"entries": combined_entries, "filtered": True, "raw": combined_raw}


@router.post("/{game}/overrides")
async def add_override(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text is required")

    now = datetime.datetime.utcnow().isoformat()
    override_id = f"override-{now[:16].replace('T', '-').replace(':', '-')}"
    row_id = str(uuid.uuid4())

    with get_db() as conn:
        conn.execute(
            """INSERT INTO human_overrides
               (id, override_id, game_slug, scope, description, type,
                requested_by, request_text, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                row_id, override_id, game,
                body.get("scope", "game"),
                body.get("description"),
                body.get("type", "live-edit"),
                body.get("requested_by", "human"),
                text, "active", now,
            ),
        )

    # Also write to markdown for backward compat with file-reading agents
    try:
        repo_service.append_override(game, text)
    except Exception:
        pass

    return {"saved": True, "id": row_id, "override_id": override_id}


def _parse_open_blockers(content: str, default_game: str) -> list:
    sections = re.split(r"(?=^## Blocker:)", content, flags=re.MULTILINE)
    blockers = []
    for s in sections:
        if not s.strip():
            continue
        id_match = re.search(r"ID:\s*(\S+)", s)
        status_match = re.search(r"Status:\s*(\S+)", s)
        title_match = re.match(r"## Blocker:\s*(.+)", s)
        game_match = re.search(r"Game:\s*(\S+)", s)
        desc_match = re.search(r"Description:\s*(.+)", s, re.DOTALL)
        if id_match and status_match and status_match.group(1) == "open":
            blockers.append({
                "id": id_match.group(1),
                "title": title_match.group(1).strip() if title_match else "",
                "status": status_match.group(1),
                "game": game_match.group(1) if game_match else default_game,
                "description": desc_match.group(1).strip()[:200] if desc_match else "",
            })
    return blockers


@router.get("/{game}/blockers")
async def get_blockers(game: str):
    blockers: list = []
    # Game-scoped blockers (primary)
    try:
        game_content = repo_service.read_file(f"games/{game}/memory/blockers.md")
        blockers += _parse_open_blockers(game_content, game)
    except FileNotFoundError:
        pass
    # Agency-level blockers filtered to this game
    try:
        agency_content = repo_service.read_file("memory/blockers.md")
        for b in _parse_open_blockers(agency_content, game):
            if b["game"].lower() == game.lower():
                blockers.append(b)
    except Exception:
        pass
    return blockers


@router.post("/{game}/blockers/resolve")
async def resolve_blockers(game: str, body: dict):
    ids = body.get("blocker_ids", [])
    repo_service.resolve_blockers(game, ids)
    return {"resolved": ids}
