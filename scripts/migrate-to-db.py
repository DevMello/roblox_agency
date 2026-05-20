"""One-time migration script: seed SQLite agency.db from existing markdown files.

Run from repo root:
    python scripts/migrate-to-db.py

Safe to run multiple times — all inserts use INSERT OR IGNORE.
"""
from __future__ import annotations

import datetime
import json
import re
import sys
import uuid
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: ensure repo root is on sys.path so webui imports work.
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Initialise config so REPO_ROOT and DB_PATH are set before other imports.
from webui.server import config as _config

_config.init(repo_override=str(REPO_ROOT))

from webui.server.db import get_db
from webui.server.db.init_db import init_db
from webui.server.services.markdown import MarkdownService

_md = MarkdownService()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.datetime.utcnow().isoformat()


def _uid() -> str:
    return str(uuid.uuid4())


def _read(path: Path) -> str | None:
    """Return file text or None if missing."""
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None


def _date_from_path(p: Path) -> str:
    """Try to extract YYYY-MM-DD from a filename, else return today."""
    m = re.search(r"(\d{4}-\d{2}-\d{2})", p.stem)
    return m.group(1) if m else _NOW[:10]


def _md_field(section: str, name: str) -> str:
    """Extract a single-line field value from a markdown section."""
    m = re.search(rf"^{re.escape(name)}:\s*(.+)$", section, re.MULTILINE)
    return m.group(1).strip() if m else ""


# ---------------------------------------------------------------------------
# Counter
# ---------------------------------------------------------------------------

_counts: dict[str, int] = {}


def _inc(table: str, n: int = 1) -> None:
    _counts[table] = _counts.get(table, 0) + n


# ---------------------------------------------------------------------------
# 1. Seed games from games/registry.md
# ---------------------------------------------------------------------------

def seed_games(db: object) -> list[str]:  # type: ignore[type-arg]
    """Parse registry.md pipe table and insert into games. Returns list of slugs."""
    registry_path = REPO_ROOT / "games" / "registry.md"
    content = _read(registry_path)
    slugs: list[str] = []
    if not content:
        print("  [games] registry.md not found — skipping")
        return slugs

    for line in content.splitlines():
        parts = [p.strip() for p in line.strip().strip("|").split("|")]
        # col 0 = name/slug, col 1 = repo_url, col 2 = status
        if len(parts) < 3:
            continue
        slug = parts[0]
        repo_url = parts[1]
        status = parts[2].lower()
        # Skip header / separator rows
        if not slug or slug.startswith("-") or slug.lower() in ("game", "name"):
            continue
        db.execute(  # type: ignore[attr-defined]
            "INSERT OR IGNORE INTO games (slug, name, status, repo_url, created_at) VALUES (?,?,?,?,?)",
            (slug, slug, status, repo_url, _NOW),
        )
        slugs.append(slug)
        _inc("games")

    return slugs


# ---------------------------------------------------------------------------
# 2. Seed sprints + sprint_tasks from games/{game}/sprint-log.md
# ---------------------------------------------------------------------------

def seed_sprints(db: object, game_slug: str) -> None:  # type: ignore[type-arg]
    sprint_path = REPO_ROOT / "games" / game_slug / "sprint-log.md"
    content = _read(sprint_path)
    if not content:
        return

    parsed = _md.parse_sprint_log(content)
    sprint_id = str(parsed.get("sprint_id") or f"{game_slug}-unknown")
    date_val = str(parsed.get("date") or _NOW[:10])
    status = str(parsed.get("status") or "unknown")
    total_mins = parsed.get("total_estimated_minutes")
    milestone_ref = parsed.get("milestone_ref")
    notes_json = json.dumps(parsed.get("notes") or []) or None

    # Reuse existing sprint row if already present (dedup by sprint_id + game_slug)
    existing_sprint = db.execute(  # type: ignore[attr-defined]
        "SELECT id FROM sprints WHERE sprint_id=? AND game_slug=?",
        (sprint_id, game_slug),
    ).fetchone()
    if existing_sprint:
        sprint_row_id = existing_sprint["id"]
    else:
        sprint_row_id = _uid()
        db.execute(  # type: ignore[attr-defined]
            """INSERT INTO sprints
               (id, sprint_id, game_slug, milestone_id, date, status,
                total_estimated_minutes, notes)
               VALUES (?,?,?,?,?,?,?,?)""",
            (sprint_row_id, sprint_id, game_slug, milestone_ref,
             date_val, status, total_mins, notes_json),
        )
        _inc("sprints")

    for task in parsed.get("tasks") or []:
        task_id_val = str(task.get("task_id") or "")
        existing_task = db.execute(  # type: ignore[attr-defined]
            "SELECT 1 FROM sprint_tasks WHERE sprint_id=? AND task_id=?",
            (sprint_row_id, task_id_val),
        ).fetchone()
        if existing_task:
            continue
        db.execute(  # type: ignore[attr-defined]
            """INSERT INTO sprint_tasks
               (id, sprint_id, task_id, assigned_agent, status, worker_id,
                started_at, completed_at, worker_started_at, attempt_count,
                pr_reference, failure_reason, qa_verdict, qa_notes,
                estimated_minutes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                _uid(),
                sprint_row_id,
                task_id_val,
                str(task.get("assigned_agent") or "builder"),
                str(task.get("status") or "pending"),
                task.get("worker_id"),
                task.get("worker_started_at"),
                task.get("completed_at"),
                task.get("worker_started_at"),
                int(task.get("attempt_count") or 0),
                task.get("pr_reference"),
                None,
                task.get("qa_verdict"),
                task.get("qa_notes"),
                task.get("estimated_minutes"),
            ),
        )
        _inc("sprint_tasks")


# ---------------------------------------------------------------------------
# 3. Seed milestones + tasks from games/{game}/plan.md
# ---------------------------------------------------------------------------

def seed_plan(db: object, game_slug: str) -> None:  # type: ignore[type-arg]
    plan_path = REPO_ROOT / "games" / game_slug / "plan.md"
    content = _read(plan_path)
    if not content:
        return

    parsed = _md.parse_plan(content)

    for ms in parsed.get("milestones") or []:
        ms_natural_id = str(ms.get("id") or "")
        success = ms.get("success_criteria") or []
        try:
            est_nights = int(ms.get("estimated_nights") or 0) or None
        except (ValueError, TypeError):
            est_nights = None
        try:
            act_nights = int(ms.get("actual_nights") or 0) or None
        except (ValueError, TypeError):
            act_nights = None

        critical_raw = str(ms.get("critical_path") or "").lower()
        critical = 1 if critical_raw in ("yes", "true", "1") else 0

        existing_ms = db.execute(  # type: ignore[attr-defined]
            "SELECT id FROM milestones WHERE game_slug=? AND milestone_id=?",
            (game_slug, ms_natural_id),
        ).fetchone()
        if existing_ms:
            ms_row_id = existing_ms["id"]
        else:
            ms_row_id = _uid()
            db.execute(  # type: ignore[attr-defined]
                """INSERT INTO milestones
                   (id, game_slug, milestone_id, name, goal, estimated_nights,
                    actual_nights, success_criteria, status, critical_path, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    ms_row_id, game_slug, ms_natural_id,
                    str(ms.get("title") or ""),
                    str(ms.get("goal") or ""),
                    est_nights, act_nights, json.dumps(success),
                    str(ms.get("status") or "pending"), critical, _NOW,
                ),
            )
            _inc("milestones")

        # Seed tasks referenced in this milestone
        for task_id in ms.get("task_ids") or []:
            exists = db.execute(  # type: ignore[attr-defined]
                "SELECT 1 FROM tasks WHERE task_id=? AND game_slug=?",
                (task_id, game_slug),
            ).fetchone()
            if not exists:
                db.execute(  # type: ignore[attr-defined]
                    """INSERT INTO tasks
                       (id, task_id, game_slug, milestone_id, status, created_at)
                       VALUES (?,?,?,?,?,?)""",
                    (_uid(), task_id, game_slug, ms_row_id, "pending", _NOW),
                )
                _inc("tasks")

    # Also seed tasks from the task_index table
    for row in parsed.get("task_index") or []:
        task_id = row.get("Task ID") or row.get("task_id") or row.get("ID") or ""
        if not task_id:
            continue
        exists = db.execute(  # type: ignore[attr-defined]
            "SELECT 1 FROM tasks WHERE task_id=? AND game_slug=?",
            (task_id, game_slug),
        ).fetchone()
        if not exists:
            title = row.get("Title") or row.get("title") or ""
            status = (row.get("Status") or row.get("status") or "pending").lower()
            db.execute(  # type: ignore[attr-defined]
                """INSERT INTO tasks
                   (id, task_id, game_slug, title, status, created_at)
                   VALUES (?,?,?,?,?,?)""",
                (_uid(), task_id, game_slug, title, status, _NOW),
            )
            _inc("tasks")


# ---------------------------------------------------------------------------
# 4. Seed progress_log from games/{game}/progress.md
# ---------------------------------------------------------------------------

def seed_progress(db: object, game_slug: str) -> None:  # type: ignore[type-arg]
    progress_path = REPO_ROOT / "games" / game_slug / "progress.md"
    content = _read(progress_path)
    if not content:
        return

    entries = _md.parse_progress_log(content)
    for entry in entries:
        message_parts = [entry.get("title") or ""]
        if entry.get("pr"):
            message_parts.append(f"PR: #{entry['pr']}")
        if entry.get("notes"):
            message_parts.append(entry["notes"])
        message = " | ".join(p for p in message_parts if p)

        task_id = entry.get("task_id")
        created_at = entry.get("date") or _NOW[:10]
        exists = db.execute(  # type: ignore[attr-defined]
            "SELECT 1 FROM progress_log WHERE game_slug=? AND task_id=? AND created_at=?",
            (game_slug, task_id, created_at),
        ).fetchone()
        if not exists:
            db.execute(  # type: ignore[attr-defined]
                """INSERT INTO progress_log
                   (game_slug, task_id, sprint_id, agent, message, created_at)
                   VALUES (?,?,?,?,?,?)""",
                (game_slug, task_id, None, "builder", message, created_at),
            )
            _inc("progress_log")


# ---------------------------------------------------------------------------
# 5. Seed agency-level blockers from memory/blockers.md
# ---------------------------------------------------------------------------

def _parse_blockers_md(content: str, game_slug: str | None, scope: str) -> list[dict]:
    """Parse blockers.md into list of dicts."""
    entries: list[dict] = []
    sections = re.split(r"(?=^## Blocker:)", content, flags=re.MULTILINE)
    for section in sections:
        if not section.strip() or not re.match(r"^## Blocker:", section):
            continue

        header_m = re.match(r"^## Blocker:\s*(.+)$", section, re.MULTILINE)
        title = header_m.group(1).strip() if header_m else ""

        entries.append({
            "blocker_id": _md_field(section, "ID") or _uid(),
            "game_slug": game_slug,
            "scope": scope,
            "title": title,
            "description": _md_field(section, "Description"),
            "type": _md_field(section, "Type"),
            "status": _md_field(section, "Status").lower() or "active",
            "responsible": _md_field(section, "Responsible"),
            "priority": _md_field(section, "Priority").lower() or "medium",
            "added_by": _md_field(section, "Added by"),
            "task_blocked": _md_field(section, "Task blocked"),
            "added_at": _md_field(section, "Added") or _NOW,
            "resolved_at": _md_field(section, "Resolved") or None,
            "resolution": _md_field(section, "Resolution") or None,
        })
    return entries


def seed_blockers(db: object, game_slug: str | None, path: Path, scope: str) -> None:  # type: ignore[type-arg]
    content = _read(path)
    if not content:
        return
    for entry in _parse_blockers_md(content, game_slug, scope):
        db.execute(  # type: ignore[attr-defined]
            """INSERT OR IGNORE INTO blockers
               (id, blocker_id, game_slug, scope, title, description, type,
                status, responsible, priority, added_by, task_blocked,
                added_at, resolved_at, resolution)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                _uid(),
                entry["blocker_id"],
                entry["game_slug"],
                entry["scope"],
                entry["title"],
                entry["description"],
                entry["type"],
                entry["status"],
                entry["responsible"],
                entry["priority"],
                entry["added_by"],
                entry["task_blocked"],
                entry["added_at"],
                entry["resolved_at"] or None,
                entry["resolution"] or None,
            ),
        )
        _inc("blockers")


# ---------------------------------------------------------------------------
# 6. Seed decisions from memory/decisions.md
# ---------------------------------------------------------------------------

def _parse_decisions_md(content: str, game_slug: str | None, scope: str) -> list[dict]:
    entries: list[dict] = []
    sections = re.split(r"(?=^## Decision:)", content, flags=re.MULTILINE)
    for section in sections:
        if not section.strip() or not re.match(r"^## Decision:", section):
            continue

        header_m = re.match(r"^## Decision:\s*(.+)$", section, re.MULTILINE)
        description = header_m.group(1).strip() if header_m else ""

        entries.append({
            "decision_id": _md_field(section, "ID") or _uid(),
            "game_slug": game_slug,
            "scope": scope,
            "description": description,
            "agent": _md_field(section, "Agent"),
            "decision_text": _md_field(section, "Decision"),
            "rationale": _md_field(section, "Rationale"),
            "alternatives_considered": _md_field(section, "Alternatives considered"),
            "status": _md_field(section, "Status").lower() or "active",
            "created_at": _md_field(section, "Timestamp") or _NOW,
        })
    return entries


def seed_decisions(db: object, game_slug: str | None, path: Path, scope: str) -> None:  # type: ignore[type-arg]
    content = _read(path)
    if not content:
        return
    for entry in _parse_decisions_md(content, game_slug, scope):
        db.execute(  # type: ignore[attr-defined]
            """INSERT OR IGNORE INTO decisions
               (id, decision_id, game_slug, scope, description, agent,
                decision_text, rationale, alternatives_considered, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                _uid(),
                entry["decision_id"],
                entry["game_slug"],
                entry["scope"],
                entry["description"],
                entry["agent"],
                entry["decision_text"],
                entry["rationale"],
                entry["alternatives_considered"],
                entry["status"],
                entry["created_at"],
            ),
        )
        _inc("decisions")


# ---------------------------------------------------------------------------
# 7. Seed human_overrides from memory/human-overrides.md
# ---------------------------------------------------------------------------

def seed_overrides(db: object, game_slug: str | None, path: Path, scope: str) -> None:  # type: ignore[type-arg]
    content = _read(path)
    if not content:
        return
    overrides = _md.parse_overrides(content)
    for entry in overrides:
        db.execute(  # type: ignore[attr-defined]
            """INSERT OR IGNORE INTO human_overrides
               (id, override_id, game_slug, scope, description, type,
                requested_by, request_text, status, applied_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                _uid(),
                str(entry.get("id") or _uid()),
                game_slug,
                scope,
                str(entry.get("description") or ""),
                str(entry.get("type") or "live-edit"),
                str(entry.get("requested_by") or ""),
                str(entry.get("request") or ""),
                str(entry.get("status") or "active"),
                str(entry.get("applied_by") or ""),
                str(entry.get("timestamp") or _NOW),
            ),
        )
        _inc("human_overrides")


# ---------------------------------------------------------------------------
# 8. Seed workers from memory/workers/ directory
# ---------------------------------------------------------------------------

def seed_workers(db: object) -> None:  # type: ignore[type-arg]
    workers_dir = REPO_ROOT / "memory" / "workers"
    if not workers_dir.is_dir():
        return

    for worker_file in workers_dir.glob("*.md"):
        slug = worker_file.stem
        content = _read(worker_file)
        if not content:
            continue

        last_seen = _md_field(content, "Last updated")
        task_info = _md_field(content, "Last task completed")
        sprint_info = _md_field(content, "Sprint")
        status_line = _md_field(content, "Status")

        # Determine overall worker status
        if "retired" in status_line.lower():
            w_status = "retired"
        else:
            w_status = "active"

        existing_worker = db.execute(  # type: ignore[attr-defined]
            "SELECT id FROM workers WHERE slug=?", (slug,)
        ).fetchone()
        if existing_worker:
            worker_id = existing_worker["id"]
        else:
            worker_id = _uid()
            db.execute(  # type: ignore[attr-defined]
                """INSERT INTO workers
                   (id, slug, machine_name, status, last_seen_at, registered_at)
                   VALUES (?,?,?,?,?,?)""",
                (worker_id, slug, slug, w_status, last_seen or _NOW, _NOW),
            )
            _inc("workers")

        # Insert a heartbeat row if we have task info (dedup by worker+task+sprint)
        if task_info or sprint_info:
            task_id_m = re.match(r"^([^\s(]+)", task_info) if task_info else None
            hb_task_id = task_id_m.group(1) if task_id_m else None
            hb_exists = db.execute(  # type: ignore[attr-defined]
                "SELECT 1 FROM worker_heartbeats WHERE worker_id=? AND task_id IS ? AND sprint_id IS ?",
                (worker_id, hb_task_id, sprint_info or None),
            ).fetchone()
            if not hb_exists:
                db.execute(  # type: ignore[attr-defined]
                    """INSERT INTO worker_heartbeats
                       (worker_id, task_id, sprint_id, status, created_at)
                       VALUES (?,?,?,?,?)""",
                    (worker_id, hb_task_id, sprint_info or None, status_line or "complete", last_seen or _NOW),
                )
                _inc("worker_heartbeats")


# ---------------------------------------------------------------------------
# 9. Seed reports from reports/morning/*.md and reports/weekly/**/*.md
# ---------------------------------------------------------------------------

def seed_reports(db: object) -> None:  # type: ignore[type-arg]
    reports_dir = REPO_ROOT / "reports"
    if not reports_dir.is_dir():
        return

    def _insert_report(rpt_type: str, rpt: Path) -> None:
        content = _read(rpt)
        if content is None:
            return
        date_val = _date_from_path(rpt)
        exists = db.execute(  # type: ignore[attr-defined]
            "SELECT 1 FROM reports WHERE type=? AND date=?", (rpt_type, date_val)
        ).fetchone()
        if not exists:
            db.execute(  # type: ignore[attr-defined]
                """INSERT INTO reports (id, type, date, game_slug, content, created_at)
                   VALUES (?,?,?,?,?,?)""",
                (_uid(), rpt_type, date_val, None, content, _NOW),
            )
            _inc("reports")

    morning_dir = reports_dir / "morning"
    if morning_dir.is_dir():
        for rpt in morning_dir.glob("*.md"):
            _insert_report("morning", rpt)

    weekly_dir = reports_dir / "weekly"
    if weekly_dir.is_dir():
        for rpt in weekly_dir.rglob("*.md"):
            _insert_report("weekly", rpt)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print(f"Initialising DB at {_config.DB_PATH} ...")
    init_db(_config.DB_PATH)

    with get_db() as db:
        print("Seeding games ...")
        game_slugs = seed_games(db)
        print(f"  Found games: {game_slugs}")

        for slug in game_slugs:
            print(f"  Processing game: {slug}")

            print(f"    Sprints ...")
            seed_sprints(db, slug)

            print(f"    Plan (milestones + tasks) ...")
            seed_plan(db, slug)

            print(f"    Progress log ...")
            seed_progress(db, slug)

            # Game-scoped blockers
            seed_blockers(
                db, slug,
                REPO_ROOT / "games" / slug / "memory" / "blockers.md",
                "game",
            )
            # Game-scoped decisions
            seed_decisions(
                db, slug,
                REPO_ROOT / "games" / slug / "memory" / "decisions.md",
                "game",
            )
            # Game-scoped overrides
            seed_overrides(
                db, slug,
                REPO_ROOT / "games" / slug / "memory" / "human-overrides.md",
                "game",
            )

        # Agency-level files
        print("Seeding agency-level blockers ...")
        seed_blockers(db, None, REPO_ROOT / "memory" / "blockers.md", "agency")

        print("Seeding agency-level decisions ...")
        seed_decisions(db, None, REPO_ROOT / "memory" / "decisions.md", "agency")

        print("Seeding agency-level human overrides ...")
        seed_overrides(db, None, REPO_ROOT / "memory" / "human-overrides.md", "agency")

        print("Seeding workers ...")
        seed_workers(db)

        print("Seeding reports ...")
        seed_reports(db)

    print("\nMigration complete. Rows inserted per table:")
    for table, count in sorted(_counts.items()):
        print(f"  {table:<25} {count:>5}")


if __name__ == "__main__":
    main()
