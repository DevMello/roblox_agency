"""RepoService — filesystem reads/writes for game state, overrides, blockers."""
from __future__ import annotations

import datetime
import re
from pathlib import Path
from typing import Any, Optional

import yaml
from fastapi import HTTPException


class RepoService:
    """Provides all repo-relative file operations used by the Agency Web UI."""

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _root(self) -> Path:
        from webui.server import config
        return config.REPO_ROOT

    def _resolve(self, path: str) -> Path:
        """Resolve a repo-relative path with traversal protection."""
        from webui.server import config
        try:
            return config.resolve_repo_path(path)
        except ValueError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

    def _check_write(self, path: str) -> None:
        from webui.server import config
        if not config.is_write_allowed(path):
            raise HTTPException(
                status_code=403,
                detail=f"Write to '{path}' is not permitted.",
            )

    # ------------------------------------------------------------------
    # Core file I/O
    # ------------------------------------------------------------------

    def read_file(self, path: str) -> str:
        """Read file at repo-relative path. Raises HTTPException 404/403."""
        abs_path = self._resolve(path)
        if not abs_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path!r}")
        if not abs_path.is_file():
            raise HTTPException(status_code=404, detail=f"Not a file: {path!r}")
        return abs_path.read_text(encoding="utf-8")

    def write_file(self, path: str, content: str) -> None:
        """Write file. Raises 403 if write not allowed."""
        self._check_write(path)
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
                    "is_dir": child.is_dir(),
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
        """Returns sorted list of game directory names under games/."""
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
        """Extract YAML front-matter block from sprint-log.md."""
        # The front-matter is delimited by --- lines
        match = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
        if not match:
            return {}
        try:
            return yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            return {}

    # ------------------------------------------------------------------
    # Plan.md milestone parser
    # ------------------------------------------------------------------

    def _parse_plan_milestones(self, content: str) -> list[str]:
        """Return list of ## header names from plan.md."""
        return [
            m.group(1).strip()
            for m in re.finditer(r"^##\s+(.+)$", content, re.MULTILINE)
        ]

    # ------------------------------------------------------------------
    # Blockers parser
    # ------------------------------------------------------------------

    def _count_open_blockers(self, game: str) -> int:
        """Count open blockers in memory/blockers.md for a given game (all if game is '*')."""
        blockers_path = self._root() / "memory" / "blockers.md"
        if not blockers_path.exists():
            return 0
        content = blockers_path.read_text(encoding="utf-8")
        # Split into sections by ## Blocker: ...
        sections = re.split(r"(?=^## Blocker:)", content, flags=re.MULTILINE)
        count = 0
        for section in sections:
            if not section.strip():
                continue
            status_match = re.search(r"^Status:\s*(\w+)", section, re.MULTILINE)
            if status_match and status_match.group(1).lower() == "open":
                count += 1
        return count

    # ------------------------------------------------------------------
    # game_state
    # ------------------------------------------------------------------

    def game_state(self, name: str) -> dict[str, Any]:
        """Reads plan.md, sprint-log.md, progress.md for a game. Returns merged dict."""
        base = self._root() / "games" / name

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
        plan_milestones: list[str] = []
        plan_path = base / "plan.md"
        if plan_path.exists():
            plan_content = plan_path.read_text(encoding="utf-8")
            plan_milestones = self._parse_plan_milestones(plan_content)

        # --- progress.md: last 10 non-empty lines ---
        recent_progress: list[str] = []
        progress_path = base / "progress.md"
        if progress_path.exists():
            lines = progress_path.read_text(encoding="utf-8").splitlines()
            recent_progress = [l for l in lines if l.strip()][-10:]

        # --- blockers ---
        open_blockers = self._count_open_blockers(name)

        return {
            "name": name,
            "sprint_id": sprint_id,
            "sprint_status": sprint_status,
            "tasks": tasks,
            "open_blockers": open_blockers,
            "plan_milestones": plan_milestones,
            "recent_progress": recent_progress,
        }

    # ------------------------------------------------------------------
    # Override / blocker mutations
    # ------------------------------------------------------------------

    def append_override(self, game: str, text: str) -> None:
        """Appends to memory/human-overrides.md with ## timestamp header."""
        now = datetime.datetime.now(tz=datetime.timezone.utc).strftime(
            "%Y-%m-%d %H:%M UTC"
        )
        header = f"\n## Override — {game} — {now}\n"
        self.append_to_file("memory/human-overrides.md", header + text.rstrip() + "\n")

    def resolve_blockers(self, game: str, blocker_ids: list[str]) -> None:
        """Sets Status: resolved on specified blocker IDs in memory/blockers.md."""
        rel = "memory/blockers.md"
        abs_path = self._resolve(rel)
        if not abs_path.exists():
            return

        content = abs_path.read_text(encoding="utf-8")
        now = datetime.datetime.now(tz=datetime.timezone.utc).strftime(
            "%Y-%m-%d %H:%M UTC"
        )

        # For each blocker_id, find the section containing that ID and flip status
        for bid in blocker_ids:
            # Match the ID line and capture surrounding context to replace Status:
            # Strategy: replace "Status: open" only within the section that contains "ID: blocker-{bid}"
            # We split by section, mutate, and rejoin.
            sections = re.split(r"(?=^## Blocker:)", content, flags=re.MULTILINE)
            updated_sections: list[str] = []
            for section in sections:
                if re.search(rf"^ID:\s*{re.escape(bid)}\s*$", section, re.MULTILINE):
                    # Replace Status: open -> Status: resolved and inject resolved_at if absent
                    section = re.sub(
                        r"^(Status:\s*)open\s*$",
                        rf"\1resolved",
                        section,
                        flags=re.MULTILINE,
                    )
                    # Add Resolved-At line if not already present
                    if not re.search(r"^Resolved-At:", section, re.MULTILINE):
                        section = re.sub(
                            r"^(Status:\s*resolved)\s*$",
                            rf"\1\nResolved-At: {now}",
                            section,
                            flags=re.MULTILINE,
                        )
                updated_sections.append(section)
            content = "".join(updated_sections)

        abs_path.write_text(content, encoding="utf-8")

    # ------------------------------------------------------------------
    # Spec path
    # ------------------------------------------------------------------

    def spec_path(self, game: str) -> str:
        """Returns relative path specs/{game}/spec.md"""
        return f"specs/{game}/spec.md"


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
