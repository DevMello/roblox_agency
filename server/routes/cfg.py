from fastapi import APIRouter, HTTPException
import os

from server.db import get_db

router = APIRouter(tags=["config"])

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
    result = []
    for line in env_example.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"): continue
        if "=" in line:
            key = line.split("=")[0].strip()
            result.append({"key": key, "has_value": bool(os.environ.get(key))})
    return result

def _repo():
    from server.services.repo import repo_service
    return repo_service

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
        pass
    # Fallback: read memory/workers.md
    from server import config as cfg
    md_path = cfg.REPO_ROOT / "memory" / "workers.md"
    try:
        return {"workers": [], "raw": md_path.read_text(encoding="utf-8"), "source": "markdown"}
    except OSError:
        return {"workers": [], "source": "empty"}

@router.get("/limits")
async def get_limits():
    try:
        return {"content": _repo().read_file("config/agent-limits.md")}
    except Exception: return {"content": ""}

@router.get("/ws/status")
async def ws_status():
    try:
        from server.routes.ws import ws_hub
        return {"connections": ws_hub.connection_count}
    except Exception: return {"connections": 0}
