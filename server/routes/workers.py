"""Workers routes — registration and heartbeat for builder agents."""
from __future__ import annotations

import sqlite3
import uuid

from fastapi import APIRouter, HTTPException

from server.db import get_db
from server.utils import now as _now

router = APIRouter(tags=["workers"])


def _find_worker(conn: sqlite3.Connection, worker_id: str) -> sqlite3.Row | None:
    """Look up a worker by slug or UUID id."""
    return conn.execute(
        "SELECT id FROM workers WHERE slug=? OR id=?", (worker_id, worker_id)
    ).fetchone()


@router.get("/")
async def list_workers():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM workers ORDER BY last_seen_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/register")
async def register_worker(body: dict):
    """One-time registration for a new worker machine."""
    slug = body.get("slug", "").strip()
    if not slug:
        raise HTTPException(400, "slug is required")

    now = _now()
    worker_id = str(uuid.uuid4())

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM workers WHERE slug=?", (slug,)
        ).fetchone()
        if existing:
            return {"id": existing["id"], "slug": slug, "already_registered": True}

        conn.execute(
            """INSERT INTO workers (id, slug, machine_name, status, last_seen_at, registered_at)
               VALUES (?, ?, ?, 'active', ?, ?)""",
            (worker_id, slug, body.get("machine_name"), now, now)
        )
    return {"id": worker_id, "slug": slug, "registered_at": now}


@router.post("/{worker_id}/heartbeat")
async def worker_heartbeat(worker_id: str, body: dict):
    """Builder calls this after each task to update last_seen and log a heartbeat."""
    now = _now()

    with get_db() as conn:
        row = _find_worker(conn, worker_id)

        if not row:
            # Auto-register if not found (backward compat with existing workers)
            wid = str(uuid.uuid4())
            conn.execute(
                """INSERT INTO workers (id, slug, status, last_seen_at, registered_at)
                   VALUES (?, ?, 'active', ?, ?)""",
                (wid, worker_id, now, now)
            )
            db_worker_id = wid
        else:
            db_worker_id = row["id"]
            conn.execute(
                "UPDATE workers SET last_seen_at=?, status='active' WHERE id=?",
                (now, db_worker_id)
            )

        conn.execute(
            """INSERT INTO worker_heartbeats (worker_id, task_id, sprint_id, status, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (
                db_worker_id,
                body.get("task_id"),
                body.get("sprint_id"),
                body.get("status", "alive"),
                now,
            )
        )

    return {"recorded": True, "timestamp": now}


@router.delete("/{worker_id}")
async def unregister_worker(worker_id: str):
    """Remove a worker from the registry."""
    with get_db() as conn:
        row = _find_worker(conn, worker_id)
        if not row:
            raise HTTPException(404, "Worker not found")
        conn.execute("DELETE FROM workers WHERE id=?", (row["id"],))
    return {"removed": True}


@router.get("/{worker_id}/heartbeats")
async def get_heartbeats(worker_id: str, limit: int = 20):
    """Get recent heartbeats for a worker."""
    with get_db() as conn:
        row = _find_worker(conn, worker_id)
        if not row:
            raise HTTPException(404, "Worker not found")

        rows = conn.execute(
            """SELECT * FROM worker_heartbeats WHERE worker_id=?
               ORDER BY created_at DESC LIMIT ?""",
            (row["id"], limit)
        ).fetchall()

    return [dict(r) for r in rows]
