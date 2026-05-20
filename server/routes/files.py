"""Files routes — read/write arbitrary repo files, list directories."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from webui.server import config as cfg
from webui.server.services.repo import repo_service  # type: ignore[attr-defined]

router = APIRouter(tags=["files"])


@router.get("/dirs/")
async def list_root():
    """List the repo root directory."""
    try:
        return repo_service.list_dir("")
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/dirs/{path:path}")
async def list_dir(path: str):
    """List a directory relative to repo root."""
    try:
        return repo_service.list_dir(path)
    except FileNotFoundError:
        raise HTTPException(404)
    except PermissionError:
        raise HTTPException(403)


@router.get("/{path:path}")
async def read_file(path: str):
    """Read a file relative to repo root."""
    try:
        content = repo_service.read_file(path)
        full = cfg.REPO_ROOT / path
        stat = full.stat()
        return {
            "path": path,
            "content": content,
            "size": stat.st_size,
            "modified": stat.st_mtime,
        }
    except PermissionError:
        raise HTTPException(403)
    except FileNotFoundError:
        raise HTTPException(404)


@router.put("/{path:path}")
async def write_file(path: str, body: dict):
    """Write a file relative to repo root (write-protected paths are rejected)."""
    if not cfg.is_write_allowed(path):
        raise HTTPException(403, "Path is write-protected")
    try:
        repo_service.write_file(path, body.get("content", ""))
    except PermissionError:
        raise HTTPException(403)
    except FileNotFoundError:
        raise HTTPException(404)
    return {"saved": True}
