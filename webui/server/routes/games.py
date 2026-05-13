"""Games routes — list games, sprint log, plan, progress, overrides, blockers."""
from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

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
    """Return structured sprint log data parsed from sprint-log.md."""
    try:
        content = repo_service.read_file(f"games/{game}/sprint-log.md")
        parsed = markdown_service.parse_sprint_log(content)
        # Attach raw content for fallback rendering
        parsed["raw"] = content
        return parsed
    except FileNotFoundError:
        raise HTTPException(404)


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
    """Return structured progress log entries parsed from progress.md."""
    try:
        content = repo_service.read_file(f"games/{game}/progress.md")
        entries = markdown_service.parse_progress_log(content)
        return {"entries": entries, "raw": content}
    except FileNotFoundError:
        raise HTTPException(404)


@router.get("/{game}/overrides")
async def get_overrides(game: str):
    """Return structured overrides for this game from memory/human-overrides.md."""
    try:
        content = repo_service.read_file("memory/human-overrides.md")
        entries = markdown_service.parse_overrides(content, game_filter=game)
        # Also return all entries if game-specific is empty
        all_entries = markdown_service.parse_overrides(content)
        return {
            "entries": entries if entries else all_entries,
            "filtered": bool(entries),
            "raw": content,
        }
    except FileNotFoundError:
        return {"entries": [], "filtered": False, "raw": ""}


@router.post("/{game}/overrides")
async def add_override(game: str, body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(400, "text is required")
    repo_service.append_override(game, text)
    return {"saved": True}


@router.get("/{game}/blockers")
async def get_blockers(game: str):
    try:
        content = repo_service.read_file("memory/blockers.md")
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
                blockers.append(
                    {
                        "id": id_match.group(1),
                        "title": title_match.group(1).strip() if title_match else "",
                        "status": status_match.group(1),
                        "game": game_match.group(1) if game_match else game,
                        "description": desc_match.group(1).strip()[:200] if desc_match else "",
                    }
                )
        return blockers
    except Exception:
        return []


@router.post("/{game}/blockers/resolve")
async def resolve_blockers(game: str, body: dict):
    ids = body.get("blocker_ids", [])
    repo_service.resolve_blockers(game, ids)
    return {"resolved": ids}
