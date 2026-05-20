"""Games routes — list games, sprint log, plan, progress, overrides, blockers."""
from __future__ import annotations

import datetime
import json

from fastapi import APIRouter, HTTPException

from server.db import get_db

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


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

@router.get("/")
async def list_games():
    """Returns list of Game objects as expected by the frontend."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT g.slug, g.name, g.status, g.repo_url, g.created_at,
                   gs.tasks_total, gs.tasks_done, gs.tasks_pending,
                   gs.tasks_failed, gs.tasks_blocked, gs.nights_elapsed,
                   gs.active_milestone, gs.phase,
                   (SELECT COUNT(*) FROM milestones m WHERE m.game_slug = g.slug) AS milestone_count,
                   (SELECT COUNT(*) FROM milestones m WHERE m.game_slug = g.slug AND m.status = 'complete') AS milestones_done,
                   (SELECT COUNT(*) FROM blockers b WHERE b.game_slug = g.slug AND b.status = 'open') AS blocker_count
            FROM games g
            LEFT JOIN game_state gs ON g.slug = gs.game_slug
            ORDER BY g.slug
        """).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# POST /
# ---------------------------------------------------------------------------

@router.post("/")
async def create_game(body: dict):
    slug = body.get("slug")
    if not slug:
        raise HTTPException(400, "slug is required")
    with get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO games (slug, name, repo_url, status, created_at) VALUES (?,?,?,?,?)",
            (slug, body.get("name", slug), body.get("repo_url"), body.get("status", "active"), _now()),
        )
    return {"saved": True, "slug": slug}


# ---------------------------------------------------------------------------
# GET /{game}
# ---------------------------------------------------------------------------

@router.get("/{game}")
async def get_game(game: str):
    with get_db() as conn:
        row = conn.execute("""
            SELECT g.*, gs.phase, gs.active_milestone, gs.nights_elapsed,
                   gs.estimated_nights_to_mvp, gs.tasks_total, gs.tasks_done,
                   gs.tasks_pending, gs.tasks_failed, gs.tasks_blocked,
                   gs.open_questions, gs.updated_at AS state_updated_at,
                   (SELECT COUNT(*) FROM milestones m WHERE m.game_slug = g.slug) AS milestone_count,
                   (SELECT COUNT(*) FROM milestones m WHERE m.game_slug = g.slug AND m.status = 'complete') AS milestones_done,
                   (SELECT COUNT(*) FROM blockers b WHERE b.game_slug = g.slug AND b.status = 'open') AS blocker_count
            FROM games g
            LEFT JOIN game_state gs ON g.slug = gs.game_slug
            WHERE g.slug = ?
        """, (game,)).fetchone()
    if not row:
        raise HTTPException(404, f"Game '{game}' not found")
    data = dict(row)
    data["open_questions"] = _loads(data.get("open_questions"), [])
    return data


# ---------------------------------------------------------------------------
# PUT /{game}
# ---------------------------------------------------------------------------

@router.put("/{game}")
async def update_game(game: str, body: dict):
    allowed = {"name", "repo_url", "status"}
    updates = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not updates:
        raise HTTPException(400, "No updatable fields")
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    with get_db() as conn:
        conn.execute(
            f"UPDATE games SET {set_clause} WHERE slug = ?",
            list(updates.values()) + [game],
        )
    return {"updated": True}


# ---------------------------------------------------------------------------
# GET /{game}/sprint-log
# ---------------------------------------------------------------------------

@router.get("/{game}/sprint-log")
async def get_sprint_log(game: str):
    """Return structured sprint log data."""
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
        else:
            task_rows = []

    if not sprint_row:
        raise HTTPException(404, f"No sprint log found for game '{game}'")

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
    with get_db() as conn:
        milestone_rows = conn.execute(
            "SELECT * FROM milestones WHERE game_slug = ? ORDER BY id",
            (game,),
        ).fetchall()
        task_rows = conn.execute(
            "SELECT * FROM tasks WHERE game_slug = ? ORDER BY task_id",
            (game,),
        ).fetchall()

    if not milestone_rows and not task_rows:
        raise HTTPException(404, f"No plan found for game '{game}'")

    return {
        "milestones": [dict(r) for r in milestone_rows],
        "tasks": [dict(r) for r in task_rows],
    }


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
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM progress_log
               WHERE game_slug = ?
               ORDER BY created_at DESC
               LIMIT 50""",
            (game,),
        ).fetchall()

    return {"entries": [dict(r) for r in rows]}


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
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM blockers
               WHERE (game_slug = ? OR scope = 'agency') AND status = 'open'
               ORDER BY created_at DESC""",
            (game,),
        ).fetchall()

    return [dict(r) for r in rows]


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

    with get_db() as conn:
        for bid in ids:
            conn.execute(
                """UPDATE blockers
                   SET status = 'resolved', resolved_at = ?, resolution = ?
                   WHERE id = ?""",
                (now, body.get("resolution", ""), bid),
            )

    return {"resolved": ids}


# ---------------------------------------------------------------------------
# GET /{game}/overrides
# ---------------------------------------------------------------------------

@router.get("/{game}/overrides")
async def get_overrides(game: str):
    """Return structured overrides from DB (game-scoped + agency-level)."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM human_overrides
               WHERE (game_slug = ? OR scope = 'agency')
               ORDER BY created_at DESC""",
            (game,),
        ).fetchall()

    entries = [dict(r) for r in rows]
    for e in entries:
        e["affected_files"] = _loads(e.get("affected_files"), [])
    return {"entries": entries, "filtered": True}


# ---------------------------------------------------------------------------
# POST /{game}/overrides
# ---------------------------------------------------------------------------

@router.post("/{game}/overrides")
async def add_override(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text is required")

    now = _now()

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
