"""Specs routes — list, read, update specs; SSE spec generation via Claude."""
from __future__ import annotations

import asyncio
import datetime
import json
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from server import config as cfg
from server.db import get_db
from server.services.repo import repo_service  # type: ignore[attr-defined]

router = APIRouter(tags=["specs"])


def _now() -> str:
    return datetime.datetime.utcnow().isoformat()


@router.get("/")
async def list_specs():
    try:
        names = repo_service.game_names()
        result = []
        for name in names:
            path = f"games/{name}/spec.md"
            try:
                repo_service.read_file(path)
                result.append({"game": name, "path": path, "exists": True})
            except Exception:
                result.append({"game": name, "path": path, "exists": False})
        return result
    except Exception:
        return []


@router.get("/{game}")
async def get_spec(game: str):
    # --- DB-first ---
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT content FROM specs WHERE game_slug = ?", (game,)
            ).fetchone()
        if row and row["content"]:
            return {"content": row["content"]}
    except Exception:
        pass

    # --- Markdown fallback ---
    try:
        return {"content": repo_service.read_file(f"games/{game}/spec.md")}
    except FileNotFoundError:
        raise HTTPException(404)


@router.put("/{game}")
async def update_spec(game: str, body: dict):
    content = body.get("content", "")

    # Write to markdown file (existing behaviour)
    repo_service.write_spec(game, content)

    # Upsert into DB
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO specs (game_slug, content, updated_at)
                   VALUES (?, ?, ?)""",
                (game, content, _now()),
            )
    except Exception:
        pass

    return {"saved": True}


@router.post("/generate")
async def generate_spec(body: dict):
    idea = body.get("idea", "")
    game = body.get("game", "new-game")
    genre = body.get("genre", "")

    api_key = os.environ.get("ANTHROPIC_API_KEY")

    async def stream_spec():
        if api_key:
            try:
                import anthropic

                client = anthropic.Anthropic(api_key=api_key)
                system = (
                    "You are a Roblox game designer. Generate a complete game spec in "
                    "markdown format with these sections:\n"
                    "# Game Name\n"
                    "## Genre\n"
                    "## Core Loop\n"
                    "## Monetisation\n"
                    "## Milestones\n"
                    "## MCP Requirements\n"
                    "## Art Style\n"
                    "## Out of Scope"
                )
                with client.messages.stream(
                    model=cfg.ANTHROPIC_MODEL,
                    max_tokens=2000,
                    system=system,
                    messages=[
                        {
                            "role": "user",
                            "content": (
                                f"Game idea: {idea}\nGenre: {genre}\nSlug: {game}"
                            ),
                        }
                    ],
                ) as stream:
                    for text in stream.text_stream:
                        yield f"data: {json.dumps({'chunk': text})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        else:
            # Fallback: stream a template without API key
            template = f"""# {game.replace("-", " ").title()}
## Genre
{genre}
## Core Loop
{idea}
## Monetisation
- Gamepass: VIP access
- Developer Products: In-game currency
## Milestones
| Milestone | Tasks | ETA |
|-----------|-------|-----|
| M1: Core Loop | Implement basic gameplay | Week 1 |
| M2: Polish | Visual improvements | Week 2 |
## MCP Requirements
- Roblox Studio MCP
## Art Style
Clean, colorful, beginner-friendly
## Out of Scope
- Custom animations
- Social features
"""
            for line in template.split("\n"):
                yield f"data: {json.dumps({'chunk': line + chr(10)})}\n\n"
                await asyncio.sleep(0.05)

        yield 'data: {"done": true}\n\n'

    return StreamingResponse(stream_spec(), media_type="text/event-stream")
