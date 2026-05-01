from fastapi import APIRouter, HTTPException
import os

router = APIRouter(tags=["config"])

@router.get("/mcp")
async def get_mcp_servers():
    try:
        from webui.server.services.mcp_registry import mcp_registry
        return mcp_registry.load()
    except Exception: return []

@router.post("/mcp")
async def add_mcp_server(body: dict):
    try:
        from webui.server.services.mcp_registry import mcp_registry
        name = body.pop("name")
        mcp_registry.add_server(name, body)
        return {"saved": True}
    except Exception as e: raise HTTPException(500, str(e))

@router.delete("/mcp/{name}")
async def remove_mcp_server(name: str):
    try:
        from webui.server.services.mcp_registry import mcp_registry
        removed = mcp_registry.remove_server(name)
        return {"removed": removed}
    except Exception as e: raise HTTPException(500, str(e))

@router.get("/mcp/health")
async def mcp_health():
    try:
        from webui.server.services.mcp_registry import mcp_registry
        return mcp_registry.health_check_all()
    except Exception: return []

@router.get("/env")
async def get_env():
    from webui.server import config as cfg
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

@router.get("/workers")
async def get_workers():
    try:
        from webui.server.services.repo import repo_service
        return {"content": repo_service.read_file("memory/workers.md")}
    except Exception: return {"content": ""}

@router.get("/limits")
async def get_limits():
    try:
        from webui.server.services.repo import repo_service
        return {"content": repo_service.read_file("config/agent-limits.md")}
    except Exception: return {"content": ""}

@router.get("/ws/status")
async def ws_status():
    try:
        from webui.server.routes.ws import ws_hub
        return {"connections": ws_hub.connection_count}
    except Exception: return {"connections": 0}
