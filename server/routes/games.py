"""Games routes — list games, sprint log, plan, progress, overrides, blockers."""
from __future__ import annotations

import datetime
import json
import re

from fastapi import APIRouter, HTTPException

from server.db import get_db
from server.services.repo import repo_service  # type: ignore[attr-defined]
from server.services.markdown import markdown_service

router = APIRouter(tags=["games"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> str:
    return datetime.datetime.utcnow().isoformat()


def _loads(val: str | None, default=None):
    if default is None:
        default = []
    if not val:
        return default
    try:
        return json.loads(val)
    except Exception:
        return default


def _matching_prs(prs: list, slug: str) -> list:
    """Return PRs whose branch name or title contains the game slug."""
    return [
        pr for pr in prs
        if slug in (pr.get("headRefName") or "").lower()
        or slug in (pr.get("title") or "").lower()
    ]


# ---------------------------------------------------------------------------
# Legacy markdown helper (used in blockers fallback)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@router.get("/")
async def list_games():
    """Returns list of Game objects as expected by the frontend."""
    try:
        from server.services.git_service import git_service
        prs = git_service.open_prs()

        # --- DB-first ---
        with get_db() as conn:
            rows = conn.execute(
                "SELECT slug, name, status FROM games ORDER BY slug"
            ).fetchall()

        if rows:
            result = []
            for row in rows:
                slug = row["slug"]
                result.append({
                    "name": row["name"] or slug,
                    "slug": slug,
                    "status": row["status"],
                    "open_pr_count": len(_matching_prs(prs, slug)),
                })
            return result

        # --- Markdown fallback ---
        names = repo_service.game_names()
        result = []
        for name in names:
            try:
                state = repo_service.game_state(name)
                state["open_pr_count"] = len(_matching_prs(prs, name))
                result.append(state)
            except Exception as e:
                result.append({"name": name, "slug": name, "error": str(e)})
        return result
    except Exception:
        return []


# ---------------------------------------------------------------------------
# GET /{game}
# ---------------------------------------------------------------------------

@router.get("/{game}")
async def get_game(game: str):
    try:
        from server.services.git_service import git_service
        prs = git_service.open_prs()
        game_prs = _matching_prs(prs, game)

        # --- DB-first ---
        with get_db() as conn:
            row = conn.execute(
                """SELECT g.*, s.phase, s.active_milestone, s.nights_elapsed,
                          s.estimated_nights_to_mvp, s.tasks_total, s.tasks_done,
                          s.tasks_pending, s.tasks_failed, s.tasks_blocked,
                          s.open_questions, s.updated_at AS state_updated_at
                   FROM games g
                   LEFT JOIN game_state s ON g.slug = s.game_slug
                   WHERE g.slug = ?""",
                (game,),
            ).fetchone()

        if row:
            data = dict(row)
            data["open_questions"] = _loads(data.get("open_questions"), [])
            data["open_pr_count"] = len(game_prs)
            data["slug"] = game
            return data

        # --- Markdown fallback ---
        state = repo_service.game_state(game)
        state["open_pr_count"] = len(game_prs)
        return state
    except FileNotFoundError:
        raise HTTPException(404, f"Game '{game}' not found")


# ---------------------------------------------------------------------------
# GET /{game}/sprint-log
# ---------------------------------------------------------------------------

@router.get("/{game}/sprint-log")
async def get_sprint_log(game: str):
    """Return structured sprint log data."""
    # --- DB-first ---
    try:
        with get_db() as conn:
            sprint_row = conn.execute(
                "SELECT * FROM sprints WHERE game_slug = ? ORDER BY date DESC LIMIT 1",
                (game,),
            ).fetchone()
            if sprint_row:
                task_rows = conn.execute(
                    "SELECT * FROM sprint_tasks WHERE sprint_id = ?",
                    (sprint_row["sprint_id"],),
                ).fetchall()

        if sprint_row:
            sprint = dict(sprint_row)
            for field in ("active_workers", "skipped_due_to_blocker",
                          "skipped_due_to_override", "conflict_report"):
                sprint[field] = _loads(sprint.get(field), [])

            tasks = []
            for t in task_rows:
                td = dict(t)
                td["depends_on"] = _loads(td.get("depends_on"), [])
                tasks.append(td)

            sprint["tasks"] = tasks
            return sprint
    except Exception:
        pass

    # --- Markdown fallback ---
    try:
        content = repo_service.read_file(f"games/{game}/sprint-log.md")
        parsed = markdown_service.parse_sprint_log(content)
        parsed["raw"] = content
        return parsed
    except FileNotFoundError:
        raise HTTPException(404)


# ---------------------------------------------------------------------------
# POST /{game}/sprint-log
# ---------------------------------------------------------------------------

@router.post("/{game}/sprint-log")
async def create_sprint_log(game: str, body: dict):
    """Insert a new sprint + task list into DB."""
    sprint_id = body.get("sprint_id")
    if not sprint_id:
        raise HTTPException(400, "sprint_id is required")

    with get_db() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO sprints
               (sprint_id, game_slug, date, milestone_ref, status,
                total_estimated_minutes, actual_start_time, actual_end_time,
                active_workers, skipped_due_to_blocker, skipped_due_to_override,
                conflict_report)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                sprint_id,
                game,
                body.get("date"),
                body.get("milestone_ref"),
                body.get("status", "pending"),
                body.get("total_estimated_minutes"),
                body.get("actual_start_time"),
                body.get("actual_end_time"),
                json.dumps(body.get("active_workers") or []),
                json.dumps(body.get("skipped_due_to_blocker") or []),
                json.dumps(body.get("skipped_due_to_override") or []),
                json.dumps(body.get("conflict_report") or []),
            ),
        )

        for t in body.get("tasks") or body.get("task_list") or []:
            conn.execute(
                """INSERT OR REPLACE INTO sprint_tasks
                   (sprint_id, task_id, title, type, description,
                    estimated_minutes, actual_minutes, assigned_agent,
                    depends_on, status, started_at, worker_started_at,
                    completed_at, pr_reference, failure_reason,
                    attempt_count, qa_verdict, qa_notes, worker_id)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    sprint_id,
                    t.get("task_id"),
                    t.get("title"),
                    t.get("type"),
                    t.get("description"),
                    t.get("estimated_minutes"),
                    t.get("actual_minutes"),
                    t.get("assigned_agent", "builder"),
                    json.dumps(t.get("depends_on") or []),
                    t.get("status", "pending"),
                    t.get("started_at"),
                    t.get("worker_started_at"),
                    t.get("completed_at"),
                    t.get("pr_reference"),
                    t.get("failure_reason"),
                    t.get("attempt_count", 0),
                    t.get("qa_verdict"),
                    t.get("qa_notes"),
                    t.get("worker_id"),
                ),
            )

    return {"saved": True, "sprint_id": sprint_id}


# ---------------------------------------------------------------------------
# PATCH /{game}/sprint-log/{sprint_id}/tasks/{task_id}
# ---------------------------------------------------------------------------

@router.patch("/{game}/sprint-log/{sprint_id}/tasks/{task_id}")
async def update_sprint_task(game: str, sprint_id: str, task_id: str, body: dict):
    """Partial update of a sprint_tasks row — only non-null body fields are applied."""
    allowed = {
        "status", "started_at", "worker_started_at", "completed_at",
        "pr_reference", "failure_reason", "attempt_count",
        "qa_verdict", "qa_notes", "actual_minutes", "worker_id",
    }
    updates = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not updates:
        raise HTTPException(400, "No updatable fields provided")

    # set_clause is safe: keys come exclusively from the hardcoded `allowed` set above.
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [sprint_id, task_id]

    with get_db() as conn:
        conn.execute(
            f"UPDATE sprint_tasks SET {set_clause} WHERE sprint_id = ? AND task_id = ?",
            values,
        )

    return {"updated": True}


# ---------------------------------------------------------------------------
# GET /{game}/plan
# ---------------------------------------------------------------------------

@router.get("/{game}/plan")
async def get_plan(game: str):
    """Return structured plan data."""
    # --- DB-first ---
    try:
        with get_db() as conn:
            milestone_rows = conn.execute(
                "SELECT * FROM milestones WHERE game_slug = ? ORDER BY id",
                (game,),
            ).fetchall()
            task_rows = conn.execute(
                "SELECT * FROM tasks WHERE game_slug = ? ORDER BY task_id",
                (game,),
            ).fetchall()

        if milestone_rows or task_rows:
            return {
                "milestones": [dict(r) for r in milestone_rows],
                "tasks": [dict(r) for r in task_rows],
            }
    except Exception:
        pass

    # --- Markdown fallback ---
    try:
        content = repo_service.read_file(f"games/{game}/plan.md")
        parsed = markdown_service.parse_plan(content)
        parsed["raw"] = content
        return parsed
    except FileNotFoundError:
        raise HTTPException(404)


# ---------------------------------------------------------------------------
# POST /{game}/plan/milestones
# ---------------------------------------------------------------------------

@router.post("/{game}/plan/milestones")
async def create_milestone(game: str, body: dict):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO milestones
               (game_slug, title, goal, status, estimated_nights, actual_nights,
                completed_at, created_at)
               VALUES (?,?,?,?,?,?,?,?)""",
            (
                game,
                body.get("title"),
                body.get("goal"),
                body.get("status", "pending"),
                body.get("estimated_nights"),
                body.get("actual_nights"),
                body.get("completed_at"),
                _now(),
            ),
        )
    return {"saved": True}


# ---------------------------------------------------------------------------
# PUT /{game}/plan/milestones/{milestone_id}
# ---------------------------------------------------------------------------

@router.put("/{game}/plan/milestones/{milestone_id}")
async def update_milestone(game: str, milestone_id: int, body: dict):
    allowed = {"title", "goal", "status", "estimated_nights", "actual_nights", "completed_at"}
    updates = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not updates:
        raise HTTPException(400, "No updatable fields provided")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [milestone_id, game]

    with get_db() as conn:
        conn.execute(
            f"UPDATE milestones SET {set_clause} WHERE id = ? AND game_slug = ?",
            values,
        )

    return {"updated": True}


# ---------------------------------------------------------------------------
# POST /{game}/plan/tasks
# ---------------------------------------------------------------------------

@router.post("/{game}/plan/tasks")
async def create_task(game: str, body: dict):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO tasks
               (task_id, game_slug, milestone_id, title, type, description,
                estimated_complexity, estimated_minutes, actual_minutes,
                assignee, status, pr_reference, ambiguity_notes,
                failure_reason, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                body.get("task_id"),
                game,
                body.get("milestone_id"),
                body.get("title"),
                body.get("type"),
                body.get("description"),
                body.get("estimated_complexity"),
                body.get("estimated_minutes"),
                body.get("actual_minutes"),
                body.get("assignee"),
                body.get("status", "pending"),
                body.get("pr_reference"),
                body.get("ambiguity_notes"),
                body.get("failure_reason"),
                _now(),
            ),
        )
    return {"saved": True}


# ---------------------------------------------------------------------------
# GET /{game}/progress
# ---------------------------------------------------------------------------

@router.get("/{game}/progress")
async def get_progress(game: str):
    """Return progress log entries."""
    # --- DB-first ---
    try:
        with get_db() as conn:
            rows = conn.execute(
                """SELECT * FROM progress_log
                   WHERE game_slug = ?
                   ORDER BY created_at DESC
                   LIMIT 50""",
                (game,),
            ).fetchall()

        if rows:
            return {"entries": [dict(r) for r in rows]}
    except Exception:
        pass

    # --- Markdown fallback ---
    try:
        content = repo_service.read_file(f"games/{game}/progress.md")
        entries = markdown_service.parse_progress_log(content)
        return {"entries": entries, "raw": content}
    except FileNotFoundError:
        raise HTTPException(404)


# ---------------------------------------------------------------------------
# POST /{game}/progress
# ---------------------------------------------------------------------------

@router.post("/{game}/progress")
async def add_progress(game: str, body: dict):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO progress_log
               (game_slug, agent, task_id, message, created_at)
               VALUES (?,?,?,?,?)""",
            (
                game,
                body.get("agent"),
                body.get("task_id"),
                body.get("message", ""),
                _now(),
            ),
        )
    return {"saved": True}


# ---------------------------------------------------------------------------
# GET /{game}/blockers
# ---------------------------------------------------------------------------

@router.get("/{game}/blockers")
async def get_blockers(game: str):
    # --- DB-first ---
    try:
        with get_db() as conn:
            rows = conn.execute(
                """SELECT * FROM blockers
                   WHERE (game_slug = ? OR scope = 'agency') AND status = 'open'
                   ORDER BY created_at DESC""",
                (game,),
            ).fetchall()

        if rows:
            return [dict(r) for r in rows]
    except Exception:
        pass

    # --- Markdown fallback ---
    blockers: list = []
    try:
        game_content = repo_service.read_file(f"games/{game}/memory/blockers.md")
        blockers += _parse_open_blockers(game_content, game)
    except FileNotFoundError:
        pass
    try:
        agency_content = repo_service.read_file("memory/blockers.md")
        for b in _parse_open_blockers(agency_content, game):
            if b["game"].lower() == game.lower():
                blockers.append(b)
    except Exception:
        pass
    return blockers


# ---------------------------------------------------------------------------
# POST /{game}/blockers
# ---------------------------------------------------------------------------

@router.post("/{game}/blockers")
async def add_blocker(game: str, body: dict):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO blockers
               (scope, game_slug, task_blocked, description, type,
                responsible, priority, added_by, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                body.get("scope", "game"),
                game,
                body.get("task_blocked"),
                body.get("description", ""),
                body.get("type"),
                body.get("responsible"),
                body.get("priority"),
                body.get("added_by"),
                body.get("status", "open"),
                _now(),
            ),
        )
    return {"saved": True}


# ---------------------------------------------------------------------------
# POST /{game}/blockers/resolve
# ---------------------------------------------------------------------------

@router.post("/{game}/blockers/resolve")
async def resolve_blockers(game: str, body: dict):
    ids = body.get("blocker_ids", [])
    if not ids:
        raise HTTPException(400, "blocker_ids is required")

    now = _now()

    # --- DB update ---
    try:
        with get_db() as conn:
            for bid in ids:
                conn.execute(
                    """UPDATE blockers
                       SET status = 'resolved', resolved_at = ?, resolution = ?
                       WHERE id = ?""",
                    (now, body.get("resolution", ""), bid),
                )
    except Exception:
        pass

    # --- Markdown fallback ---
    repo_service.resolve_blockers(game, ids)
    return {"resolved": ids}


# ---------------------------------------------------------------------------
# GET /{game}/overrides
# ---------------------------------------------------------------------------

@router.get("/{game}/overrides")
async def get_overrides(game: str):
    """Return structured overrides from DB (game-scoped + agency-level)."""
    # --- DB-first ---
    try:
        with get_db() as conn:
            rows = conn.execute(
                """SELECT * FROM human_overrides
                   WHERE (game_slug = ? OR scope = 'agency')
                   ORDER BY created_at DESC""",
                (game,),
            ).fetchall()

        if rows:
            entries = [dict(r) for r in rows]
            for e in entries:
                e["affected_files"] = _loads(e.get("affected_files"), [])
            return {"entries": entries, "filtered": True}
    except Exception:
        pass

    # --- Markdown fallback ---
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


# ---------------------------------------------------------------------------
# POST /{game}/overrides
# ---------------------------------------------------------------------------

@router.post("/{game}/overrides")
async def add_override(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text is required")

    now = _now()

    # --- DB insert ---
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO human_overrides
                   (scope, game_slug, type, requested_by, request,
                    affected_files, status, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    body.get("scope", "game"),
                    game,
                    body.get("type", "live-edit"),
                    body.get("requested_by"),
                    text,
                    json.dumps(body.get("affected_files") or []),
                    body.get("status", "active"),
                    now,
                ),
            )
    except Exception:
        pass

    # --- Dual-write to markdown ---
    repo_service.append_override(game, text)
    return {"saved": True}


# ---------------------------------------------------------------------------
# GET /{game}/state
# ---------------------------------------------------------------------------

@router.get("/{game}/state")
async def get_game_state(game: str):
    """Return game_state row for the given game slug."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM game_state WHERE game_slug = ?", (game,)
        ).fetchone()

    if not row:
        raise HTTPException(404, f"No state found for game '{game}'")

    data = dict(row)
    data["open_questions"] = _loads(data.get("open_questions"), [])
    return data
