"""RepoService — filesystem reads/writes for game state, overrides, blockers."""
from __future__ import annotations

import datetime
import re
import sqlite3
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException

from server import config as cfg
from server.services.markdown import markdown_service


class RepoService:
    """Provides all repo-relative file operations used by the Agency Web UI."""

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _db_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(cfg.DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def _root(self) -> Path:
        from server import config
        return config.REPO_ROOT

    def _resolve(self, path: str) -> Path:
        """Resolve a repo-relative path with traversal protection."""
        from server import config
        try:
            return config.resolve_repo_path(path)
        except ValueError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

    def _check_write(self, path: str) -> None:
        from server import config
        if not config.is_write_allowed(path):
            raise HTTPException(
                status_code=403,
                detail=f"Write to '{path}' is not permitted.",
            )

    # ------------------------------------------------------------------
    # Core file I/O
    # ------------------------------------------------------------------

    def read_file(self, path: str) -> str:
        """Read file at repo-relative path.

        Raises:
            FileNotFoundError: if the path does not exist or is not a file.
            HTTPException(403): if the path escapes the repo root.
        """
        abs_path = self._resolve(path)
        if not abs_path.exists() or not abs_path.is_file():
            raise FileNotFoundError(path)
        return abs_path.read_text(encoding="utf-8")

    def write_file(self, path: str, content: str) -> None:
        """Write file. Raises 403 if write not allowed."""
        self._check_write(path)
        abs_path = self._resolve(path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(content, encoding="utf-8")

    def write_spec(self, game: str, content: str) -> None:
        """Write games/{game}/spec.md via dedicated route-only path."""
        path = f"games/{game}/spec.md"
        abs_path = self._resolve(path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(content, encoding="utf-8")

    def append_to_file(self, path: str, text: str) -> None:
        """Append text to file (used for override/blockers)."""
        abs_path = self._resolve(path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        with abs_path.open("a", encoding="utf-8") as fh:
            fh.write(text)

    # ------------------------------------------------------------------
    # Directory listing
    # ------------------------------------------------------------------

    def list_dir(self, path: str) -> list[dict[str, Any]]:
        """Returns list of {name, path, is_dir, size, modified} dicts."""
        abs_path = self._resolve(path)
        if not abs_path.exists():
            raise HTTPException(status_code=404, detail=f"Directory not found: {path!r}")
        if not abs_path.is_dir():
            raise HTTPException(status_code=404, detail=f"Not a directory: {path!r}")

        entries: list[dict[str, Any]] = []
        for child in sorted(abs_path.iterdir(), key=lambda p: (p.is_file(), p.name)):
            stat = child.stat()
            rel = child.relative_to(self._root()).as_posix()
            entries.append(
                {
                    "name": child.name,
                    "path": rel,
                    "kind": "dir" if child.is_dir() else "file",
                    "size": stat.st_size if child.is_file() else 0,
                    "modified": datetime.datetime.fromtimestamp(
                        stat.st_mtime, tz=datetime.timezone.utc
                    ).isoformat(),
                }
            )
        return entries

    # ------------------------------------------------------------------
    # Game helpers
    # ------------------------------------------------------------------

    def game_names(self) -> list[str]:
        """Returns sorted list of active game slugs (DB-first, filesystem fallback)."""
        try:
            conn = self._db_conn()
            try:
                rows = conn.execute(
                    "SELECT slug FROM games WHERE status != 'retired' ORDER BY slug"
                ).fetchall()
                if rows:
                    return [r["slug"] for r in rows]
            finally:
                conn.close()
        except Exception:
            pass
        return self._game_names_from_markdown()

    def _game_names_from_markdown(self) -> list[str]:
        """Fallback: returns sorted list of game directory names under games/."""
        games_dir = self._root() / "games"
        if not games_dir.is_dir():
            return []
        names: list[str] = []
        for entry in games_dir.iterdir():
            if not entry.is_dir():
                continue
            if (entry / "plan.md").exists() or (entry / "sprint-log.md").exists():
                names.append(entry.name)
        return sorted(names)

    # ------------------------------------------------------------------
    # Sprint-log YAML front-matter parser
    # ------------------------------------------------------------------

    def _parse_sprint_frontmatter(self, content: str) -> dict[str, Any]:
        fm, _ = markdown_service.parse_frontmatter(content)
        return fm

    # ------------------------------------------------------------------
    # Plan.md milestone parser
    # ------------------------------------------------------------------

    def _parse_registry_status(self, root: Optional[Path] = None) -> dict[str, str]:
        """Returns {game_name: status} from games/registry.md table."""
        registry_path = (root or self._root()) / "games" / "registry.md"
        if not registry_path.exists():
            return {}
        statuses: dict[str, str] = {}
        for line in registry_path.read_text(encoding="utf-8").splitlines():
            # Match table data rows: | game-name | ... | status |
            parts = [p.strip() for p in line.strip().strip("|").split("|")]
            if len(parts) >= 3 and parts[0] and not parts[0].startswith("-") and parts[0] != "Game":
                statuses[parts[0]] = parts[2].lower()
        return statuses

    def _parse_plan_milestones(self, content: str) -> list[dict[str, Any]]:
        """Return list of milestone objects from plan.md."""
        # Match "### M1 — Infrastructure Foundation" and then the fields below it
        sections = re.split(r"(?=^### M\d+ — )", content, flags=re.MULTILINE)
        milestones = []
        for s in sections:
            if not s.strip() or not s.startswith("### M"):
                continue
            title_line = s.splitlines()[0]
            title = title_line.replace("### ", "").strip()
            status_match = re.search(r"\*\*Status:\*\*\s*([\w-]+)", s)
            status = status_match.group(1).lower() if status_match else "pending"
            milestones.append({
                "title": title,
                "status": status
            })
        return milestones

    # ------------------------------------------------------------------
    # Blockers parser
    # ------------------------------------------------------------------

    def _count_open_in_content(self, content: str, game_filter: str) -> int:
        """Count open blockers in a blockers.md content string.
        Pass game_filter='*' to count all sections regardless of Game: field."""
        sections = re.split(r"(?=^## Blocker:)", content, flags=re.MULTILINE)
        count = 0
        for section in sections:
            if not section.strip():
                continue
            if game_filter != "*":
                game_match = re.search(r"^Game:\s*(.+)$", section, re.MULTILINE)
                section_game = game_match.group(1).strip().lower() if game_match else ""
                if section_game != game_filter.lower():
                    continue
            resolved_match = re.search(r"^Resolved:\s*(.*)$", section, re.MULTILINE)
            status_match = re.search(r"^Status:\s*(\w+)", section, re.MULTILINE)
            is_open_by_resolved = resolved_match is not None and not resolved_match.group(1).strip()
            is_open_by_status = status_match is not None and status_match.group(1).lower() == "open"
            if is_open_by_resolved or is_open_by_status:
                count += 1
        return count

    def _count_open_blockers(self, game: str, root: Optional[Path] = None) -> int:
        """Count unresolved blockers from both agency and game-scoped blockers.md."""
        r = root or self._root()
        count = 0
        agency_path = r / "memory" / "blockers.md"
        if agency_path.exists():
            count += self._count_open_in_content(agency_path.read_text(encoding="utf-8"), game)
        game_path = r / "games" / game / "memory" / "blockers.md"
        if game_path.exists():
            # Every entry in the game-scoped file belongs to this game
            count += self._count_open_in_content(game_path.read_text(encoding="utf-8"), "*")
        return count

    # ------------------------------------------------------------------
    # game_state
    # ------------------------------------------------------------------

    def game_state(self, name: str) -> dict[str, Any]:
        """Returns merged game state dict (DB-first, markdown fallback)."""
        try:
            conn = self._db_conn()
            try:
                g = conn.execute("SELECT * FROM games WHERE slug=?", (name,)).fetchone()
                if g:
                    state_row = conn.execute(
                        "SELECT * FROM game_state WHERE game_slug=?", (name,)
                    ).fetchone()
                    milestones = conn.execute(
                        "SELECT * FROM milestones WHERE game_slug=? ORDER BY id", (name,)
                    ).fetchall()
                    open_blockers = conn.execute(
                        "SELECT COUNT(*) as cnt FROM blockers "
                        "WHERE (game_slug=? OR scope='agency') AND status='open'", (name,)
                    ).fetchone()["cnt"]
                    result = dict(g)
                    if state_row:
                        result.update(dict(state_row))
                    result["milestones"] = [dict(m) for m in milestones]
                    result["open_blocker_count"] = open_blockers
                    return result
            finally:
                conn.close()
        except Exception:
            pass
        return self._game_state_from_markdown(name)

    def _game_state_from_markdown(self, name: str) -> dict[str, Any]:
        """Fallback: reads plan.md, sprint-log.md, progress.md for a game. Returns merged dict."""
        root = self._root()
        base = root / "games" / name

        # --- sprint-log.md ---
        sprint_id: Optional[str] = None
        sprint_status: Optional[str] = None
        tasks: list[dict[str, Any]] = []
        sprint_log_path = base / "sprint-log.md"
        if sprint_log_path.exists():
            sprint_content = sprint_log_path.read_text(encoding="utf-8")
            fm = self._parse_sprint_frontmatter(sprint_content)
            sprint_id = fm.get("sprint_id")
            sprint_status = fm.get("status")
            raw_tasks = fm.get("tasks") or []
            if isinstance(raw_tasks, list):
                for t in raw_tasks:
                    if isinstance(t, dict):
                        tasks.append(
                            {
                                "task_id": t.get("task_id", ""),
                                "status": t.get("status", ""),
                                "worker_started_at": t.get("worker_started_at"),
                                "completed_at": t.get("completed_at"),
                                "pr_reference": t.get("pr_reference"),
                            }
                        )

        # --- plan.md ---
        plan_milestones: list[dict[str, Any]] = []
        plan_path = base / "plan.md"
        if plan_path.exists():
            plan_content = plan_path.read_text(encoding="utf-8")
            plan_milestones = self._parse_plan_milestones(plan_content)

        # --- progress.md: last 10 non-empty lines ---
        recent_progress: list[str] = []
        progress_path = base / "progress.md"
        if progress_path.exists():
            lines = progress_path.read_text(encoding="utf-8").splitlines()
            recent_progress = [ln for ln in lines if ln.strip()][-10:]

        # --- blockers ---
        open_blockers = self._count_open_blockers(name, root)

        # --- registry status ---
        registry_statuses = self._parse_registry_status(root)
        registry_status = registry_statuses.get(name, "unknown")

        return {
            "name": name,
            "slug": name,
            "sprint_id": sprint_id,
            "current_sprint": int(sprint_id) if sprint_id and str(sprint_id).isdigit() else None,
            "sprint_status": sprint_status,
            "tasks": tasks,
            "task_count": len(tasks),
            "tasks_done": sum(1 for t in tasks if t.get("status") == "done"),
            "open_blockers": open_blockers,
            "blocker_count": open_blockers,
            "plan_milestones": plan_milestones,
            "milestone_count": len(plan_milestones),
            "milestones_done": sum(1 for m in plan_milestones if m.get("status") == "complete"),
            "recent_progress": recent_progress,
            "spec_path": f"games/{name}/spec.md",
            "plan_path": f"games/{name}/plan.md",
            "sprint_log_path": f"games/{name}/sprint-log.md",
            "progress_path": f"games/{name}/progress.md",
            "open_pr_count": 0,  # Populated in routes if needed
            "last_run_at": None,
            "registry_status": registry_status,
        }

    def open_blocker_count(self, game: str) -> int:
        """Returns count of open blockers for a game (DB-first, markdown fallback)."""
        try:
            conn = sqlite3.connect(cfg.DB_PATH)
            try:
                row = conn.execute(
                    "SELECT COUNT(*) FROM blockers "
                    "WHERE (game_slug=? OR scope='agency') AND status='open'",
                    (game,)
                ).fetchone()
                return row[0]
            finally:
                conn.close()
        except Exception:
            pass
        return self._open_blocker_count_from_markdown(game)

    def _open_blocker_count_from_markdown(self, game: str) -> int:
        """Fallback: count open blockers from markdown files."""
        return self._count_open_blockers(game, self._root())

    # ------------------------------------------------------------------
    # Override / blocker mutations
    # ------------------------------------------------------------------

    def append_override(self, game: str, text: str) -> None:
        """Appends to games/{game}/memory/human-overrides.md (agency-level fallback)."""
        now = datetime.datetime.now(tz=datetime.timezone.utc).strftime(
            "%Y-%m-%d %H:%M UTC"
        )
        header = f"\n## Override — {game} — {now}\n"
        game_dir = self._root() / "games" / game
        if game_dir.is_dir():
            self.append_to_file(f"games/{game}/memory/human-overrides.md", header + text.rstrip() + "\n")
        else:
            self.append_to_file("memory/human-overrides.md", header + text.rstrip() + "\n")

    def _resolve_ids_in_file(self, abs_path: Path, blocker_ids: list[str], now: str) -> None:
        """Mutates a blockers.md file to mark the given IDs as resolved."""
        if not abs_path.exists():
            return
        content = abs_path.read_text(encoding="utf-8")
        sections = re.split(r"(?=^## Blocker:)", content, flags=re.MULTILINE)
        id_set = set(blocker_ids)
        updated: list[str] = []
        for section in sections:
            id_match = re.search(r"^ID:\s*(\S+)\s*$", section, re.MULTILINE)
            if id_match and id_match.group(1) in id_set:
                section = re.sub(
                    r"^(Status:\s*)open\s*$", r"\1resolved", section, flags=re.MULTILINE
                )
                if not re.search(r"^Resolved-At:", section, re.MULTILINE):
                    section = re.sub(
                        r"^(Status:\s*resolved)\s*$",
                        rf"\1\nResolved-At: {now}",
                        section,
                        flags=re.MULTILINE,
                    )
            updated.append(section)
        abs_path.write_text("".join(updated), encoding="utf-8")

    def resolve_blockers(self, game: str, blocker_ids: list[str]) -> None:
        """Sets Status: resolved on specified blocker IDs in agency and game-scoped blockers.md."""
        now = datetime.datetime.now(tz=datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        self._resolve_ids_in_file(self._root() / "memory" / "blockers.md", blocker_ids, now)
        self._resolve_ids_in_file(
            self._root() / "games" / game / "memory" / "blockers.md", blocker_ids, now
        )

    # ------------------------------------------------------------------
    # Spec path
    # ------------------------------------------------------------------

    def spec_path(self, game: str) -> str:
        """Returns relative path games/{game}/spec.md"""
        return f"games/{game}/spec.md"


# ---------------------------------------------------------------------------
# Module-level singletons
# ---------------------------------------------------------------------------

repo_service = RepoService()


class _RepoWatcher:
    """Stub watcher — full watchdog integration handled by Unit 8."""

    def start(self) -> None:  # noqa: D401
        pass

    def stop(self) -> None:
        pass


repo_watcher = _RepoWatcher()
