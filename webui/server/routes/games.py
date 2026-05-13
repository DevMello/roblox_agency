"""Games routes — list games, sprint log, plan, progress, overrides, blockers."""
from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

from webui.server.services.repo import repo_service  # type: ignore[attr-defined]

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
                # Estimate open PRs for this game by checking branch names or PR titles
                # This is a heuristic: match if 'name' (slug) is in headRefName or title
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
    try:
        content = repo_service.read_file(f"games/{game}/sprint-log.md")
        state = repo_service.game_state(game)
        return {"content": content, "tasks": state.get("tasks", [])}
    except FileNotFoundError:
        raise HTTPException(404)


@router.get("/{game}/plan")
async def get_plan(game: str):
    try:
        return {"content": repo_service.read_file(f"games/{game}/plan.md")}
    except FileNotFoundError:
        raise HTTPException(404)


@router.get("/{game}/progress")
async def get_progress(game: str):
    try:
        return {"content": repo_service.read_file(f"games/{game}/progress.md")}
    except FileNotFoundError:
        raise HTTPException(404)


@router.get("/{game}/overrides")
async def get_overrides(game: str):
    try:
        content = repo_service.read_file("memory/human-overrides.md")
        return {"content": content}
    except FileNotFoundError:
        return {"content": ""}


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
            if id_match and status_match and status_match.group(1) == "open":
                blockers.append(
                    {
                        "id": id_match.group(1),
                        "title": title_match.group(1) if title_match else "",
                        "status": status_match.group(1),
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
