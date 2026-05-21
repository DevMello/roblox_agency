from __future__ import annotations

import asyncio
import datetime
import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

from server.db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["config"])


def _cfg_path(filename: str) -> Path:
    from server import config as cfg
    return cfg.REPO_ROOT / "config" / filename


def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def _mcp():
    from server.services.mcp_registry import mcp_registry
    return mcp_registry

@router.get("/mcp")
async def get_mcp_servers():
    try:
        return _mcp().load()
    except Exception: return []

@router.post("/mcp")
async def add_mcp_server(body: dict):
    try:
        name = body.get("name")
        if not name:
            raise HTTPException(400, "name is required")
        payload = {k: v for k, v in body.items() if k != "name"}
        _mcp().add_server(name, payload)
        return {"saved": True}
    except HTTPException:
        raise
    except Exception as e: raise HTTPException(500, str(e))

@router.delete("/mcp/{name}")
async def remove_mcp_server(name: str):
    try:
        removed = _mcp().remove_server(name)
        return {"removed": removed}
    except Exception as e: raise HTTPException(500, str(e))

@router.get("/mcp/health")
async def mcp_health():
    try:
        return _mcp().health_check_all()
    except Exception: return []

@router.get("/env")
async def get_env():
    from server import config as cfg
    env_example = cfg.REPO_ROOT / ".env.example"
    if not env_example.exists():
        return []
    try:
        text = env_example.read_text(encoding="utf-8")
    except OSError:
        logger.exception("Failed to read .env.example")
        return []
    result = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key = line.split("=", 1)[0].strip()
            if key:
                result.append({"key": key, "has_value": bool(os.environ.get(key))})
    return result

def _repo():
    from server.services.repo import repo_service
    return repo_service


def _parse_workers_md(text: str) -> list[dict]:
    """Parse a markdown table of workers into a list of dicts."""
    workers: list[dict] = []
    lines = [s for l in text.splitlines() if (s := l.strip()).startswith("|")]
    if len(lines) < 2:
        return workers
    headers = [h.strip() for h in lines[0].strip("|").split("|")]
    for row in lines[2:]:  # skip header and separator
        cells = [c.strip() for c in row.strip("|").split("|")]
        if len(cells) == len(headers):
            workers.append(dict(zip(headers, cells)))
    return workers


@router.get("/workers")
async def get_workers():
    try:
        with get_db() as conn:
            rows = conn.execute(
                "SELECT id, slug, machine_name, status, last_seen_at, registered_at "
                "FROM workers ORDER BY last_seen_at DESC"
            ).fetchall()
            if rows:
                workers = [dict(r) for r in rows]
                return {"workers": workers, "source": "db"}
    except Exception:
        logger.exception("workers DB query failed")
    # Fallback: read memory/workers.md
    from server import config as cfg
    md_path = cfg.REPO_ROOT / "memory" / "workers.md"
    try:
        raw = md_path.read_text(encoding="utf-8")
        parsed = _parse_workers_md(raw)
        return {"workers": parsed, "source": "markdown"}
    except OSError:
        return {"workers": [], "source": "empty"}

@router.get("/limits")
async def get_limits():
    try:
        return {"content": _repo().read_file("system/config/agent-limits.md")}
    except Exception: return {"content": ""}

@router.get("/ws/status")
async def ws_status():
    try:
        from server.routes.ws import ws_hub
        return {"connections": ws_hub.connection_count}
    except Exception: return {"connections": 0}


# ── Raw .mcp.json ──────────────────────────────────────────────────────────────

@router.get("/mcp/raw")
async def get_mcp_raw():
    from server import config as cfg
    path = cfg.REPO_ROOT / ".mcp.json"
    try:
        return {"content": path.read_text(encoding="utf-8")}
    except OSError:
        return {"content": "{}"}


# ── Skills ─────────────────────────────────────────────────────────────────────

_SKILLS_PATH = _cfg_path("skills.json")
_SKILLS_DEFAULT = [
    {"name": "luau-scripting",       "agent": "builder",   "active": True,  "description": ""},
    {"name": "blender-export",       "agent": "builder",   "active": True,  "description": ""},
    {"name": "milestone-planning",   "agent": "architect", "active": True,  "description": ""},
    {"name": "physics-tuning",       "agent": "builder",   "active": False, "description": ""},
    {"name": "monetisation-balance", "agent": "planner",   "active": False, "description": ""},
]


@router.get("/skills")
async def get_skills():
    return _read_json(_SKILLS_PATH, _SKILLS_DEFAULT)


@router.post("/skills")
async def add_skill(body: dict):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "name is required")
    skills = _read_json(_SKILLS_PATH, _SKILLS_DEFAULT)
    if any(s["name"] == name for s in skills):
        raise HTTPException(409, f"Skill '{name}' already exists")
    skills.append({
        "name": name,
        "agent": body.get("agent", "builder"),
        "active": bool(body.get("active", True)),
        "description": body.get("description", ""),
    })
    _write_json(_SKILLS_PATH, skills)
    return {"saved": True}


@router.patch("/skills/{name}")
async def update_skill(name: str, body: dict):
    skills = _read_json(_SKILLS_PATH, _SKILLS_DEFAULT)
    idx = next((i for i, s in enumerate(skills) if s["name"] == name), None)
    if idx is None:
        raise HTTPException(404, f"Skill '{name}' not found")
    skills[idx] = {**skills[idx], **{k: v for k, v in body.items() if k != "name"}}
    _write_json(_SKILLS_PATH, skills)
    return {"saved": True}


@router.delete("/skills/{name}")
async def delete_skill(name: str):
    skills = _read_json(_SKILLS_PATH, _SKILLS_DEFAULT)
    filtered = [s for s in skills if s["name"] != name]
    if len(filtered) == len(skills):
        raise HTTPException(404, f"Skill '{name}' not found")
    _write_json(_SKILLS_PATH, filtered)
    return {"removed": True}


# ── UI Settings ────────────────────────────────────────────────────────────────

_SETTINGS_PATH = _cfg_path("ui-settings.json")
_SETTINGS_DEFAULT: dict = {"calculate_usage": False}


@router.get("/settings")
async def get_settings():
    return _read_json(_SETTINGS_PATH, dict(_SETTINGS_DEFAULT))


@router.patch("/settings")
async def patch_settings(body: dict):
    settings = _read_json(_SETTINGS_PATH, dict(_SETTINGS_DEFAULT))
    settings.update(body)
    _write_json(_SETTINGS_PATH, settings)
    return settings


# ── Usage (ccusage) ────────────────────────────────────────────────────────────

async def _run_ccusage(*args: str) -> dict:
    """Run ccusage subcommand with --json. Tries global binary first, then npx."""
    for cmd in (["ccusage", *args, "--json"], ["npx", "ccusage@latest", *args, "--json"]):
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=90)
            raw_out = stdout.decode("utf-8", errors="replace").strip()
            raw_err = stderr.decode("utf-8", errors="replace").strip()
            if proc.returncode != 0:
                return {"error": "ccusage failed", "detail": raw_err or raw_out}
            try:
                return json.loads(raw_out)
            except json.JSONDecodeError:
                return {"error": "ccusage output not valid JSON", "raw": raw_out[:2000]}
        except asyncio.TimeoutError:
            return {"error": "ccusage timed out after 90 s"}
        except FileNotFoundError:
            continue  # try next command
    return {"error": "ccusage not found — install with: npm install -g ccusage"}


@router.get("/usage")
async def get_usage():
    data = await _run_ccusage("daily")
    # ccusage may return a list directly or {"daily": [...]}
    if isinstance(data, list):
        daily: list[dict] = data
    else:
        if "error" in data:
            return data
        daily = data.get("daily", data.get("data", []))
    today = datetime.date.today()
    week_ago = today - datetime.timedelta(days=7)

    spend_7d = 0.0
    tokens_24h = 0
    input_24h = 0
    output_24h = 0
    cache_create_24h = 0
    cache_read_24h = 0

    for entry in daily:
        try:
            entry_date = datetime.date.fromisoformat(entry.get("period", ""))
        except ValueError:
            continue
        cost = entry.get("totalCost", 0) or 0
        if entry_date >= week_ago:
            spend_7d += cost
        if entry_date == today:
            tokens_24h = entry.get("totalTokens", 0) or 0
            input_24h = entry.get("inputTokens", 0) or 0
            output_24h = entry.get("outputTokens", 0) or 0
            cache_create_24h = entry.get("cacheCreationTokens", 0) or 0
            cache_read_24h = entry.get("cacheReadTokens", 0) or 0

    # include last 7 days for sparkline
    recent = [
        e for e in daily
        if (d := _try_date(e.get("period", ""))) is not None and d >= week_ago
    ]

    return {
        "spend_7d": round(spend_7d, 4),
        "tokens_24h": tokens_24h,
        "input_24h": input_24h,
        "output_24h": output_24h,
        "cache_creation_24h": cache_create_24h,
        "cache_read_24h": cache_read_24h,
        "daily": recent,
    }


@router.get("/usage/debug")
async def get_usage_debug():
    """Return raw ccusage output for troubleshooting."""
    for cmd in (["ccusage", "daily", "--json"], ["npx", "ccusage@latest", "daily", "--json"]):
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=90)
            return {
                "cmd": cmd,
                "returncode": proc.returncode,
                "stdout": stdout.decode("utf-8", errors="replace")[:5000],
                "stderr": stderr.decode("utf-8", errors="replace")[:2000],
            }
        except FileNotFoundError:
            continue
        except asyncio.TimeoutError:
            return {"cmd": cmd, "error": "timeout"}
    return {"error": "ccusage not found"}


def _try_date(s: str):
    try:
        return datetime.date.fromisoformat(s)
    except ValueError:
        return None
