"""
Agency UI — CLI entry point.

startup sequence:
  1. Verify repo root (architecture.md + agents/ fingerprint)
  2. Build React client if dist/ is stale
  3. Initialise SQLite DB
  4. Start APScheduler
  5. Start uvicorn
  6. Print startup banner
  7. Open browser tab (unless --no-browser)
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


BANNER = r"""
 ██████╗  ██████╗ ██████╗ ██╗      ██████╗ ██╗  ██╗
 ██╔══██╗██╔═══██╗██╔══██╗██║     ██╔═══██╗╚██╗██╔╝
 ██████╔╝██║   ██║██████╔╝██║     ██║   ██║ ╚███╔╝
 ██╔══██╗██║   ██║██╔══██╗██║     ██║   ██║ ██╔██╗
 ██║  ██║╚██████╔╝██████╔╝███████╗╚██████╔╝██╔╝ ██╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝
                                            AGENCY UI
"""


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Roblox Agency Web UI")
    p.add_argument("--port", type=int, default=7432, help="Port to listen on (default 7432)")
    p.add_argument("--host", default="127.0.0.1", help="Host to bind to (default 127.0.0.1)")
    p.add_argument("--no-browser", action="store_true", help="Do not auto-open browser tab")
    p.add_argument("--repo", default=None, help="Path to repo root (default: auto-detect from cwd)")
    p.add_argument("--reload", action="store_true", help="Enable uvicorn auto-reload (dev mode)")
    return p.parse_args()


def _build_client(client_dir: Path) -> None:
    """Build the React client if dist/ is missing or stale."""
    dist_dir = client_dir / "dist"
    pkg_json = client_dir / "package.json"

    if not pkg_json.exists():
        print("  [ui] No client/package.json found — skipping build")
        return

    node_modules = client_dir / "node_modules"
    if not node_modules.exists():
        print("  [ui] Installing client dependencies...")
        subprocess.run(["npm", "install"], cwd=str(client_dir), check=True)

    # Build if dist/ missing or package.json is newer than dist/index.html
    needs_build = not dist_dir.exists()
    if not needs_build and pkg_json.exists():
        idx = dist_dir / "index.html"
        if not idx.exists() or pkg_json.stat().st_mtime > idx.stat().st_mtime:
            needs_build = True

    if needs_build:
        print("  [ui] Building React client...")
        subprocess.run(["npm", "run", "build"], cwd=str(client_dir), check=True)
        print("  [ui] Build complete.")
    else:
        print("  [ui] Client dist/ is up to date.")


def _host_warning(host: str) -> None:
    if host not in ("127.0.0.1", "localhost"):
        print(
            "\n  ⚠  WARNING: Server is exposed on a non-loopback address."
            "\n     This tool is designed for local use only."
            "\n     Protect the port with a firewall rule or SSH tunnel.\n"
        )


def _print_banner(host: str, port: int, repo_root: Path, games: list[str], mcp_status: dict[str, bool]) -> None:
    print(BANNER)
    url = f"http://{host}:{port}"
    games_str = ", ".join(games) if games else "(none found)"
    print(f"  Repo   : {repo_root}")
    print(f"  Games  : {games_str}")
    print(f"  Server : {url}")
    print()

    mcp_parts = []
    for name, ok in mcp_status.items():
        icon = "✅" if ok else "❌"
        mcp_parts.append(f"{icon} {name}")
    if mcp_parts:
        print(f"  MCP    : {' '.join(mcp_parts)}")

    print()
    print("  Ready. Press Ctrl+C to stop.")
    print()


def _discover_games(repo_root: Path) -> list[str]:
    games_dir = repo_root / "games"
    if not games_dir.is_dir():
        return []
    return sorted(d.name for d in games_dir.iterdir() if d.is_dir())


def _check_mcp(repo_root: Path) -> dict[str, bool]:
    import json
    mcp_file = repo_root / ".mcp.json"
    if not mcp_file.exists():
        return {}
    try:
        data = json.loads(mcp_file.read_text())
        servers = data.get("mcpServers", {})
        return {name: True for name in servers}  # optimistic — real health check in service layer
    except Exception:
        return {}


def main() -> None:
    args = _parse_args()

    # Step 1: Resolve repo root
    from server import config as cfg
    try:
        cfg.init(args.repo)
    except RuntimeError as exc:
        print(f"\n  ✖  {exc}\n")
        sys.exit(1)

    repo_root = cfg.REPO_ROOT
    client_dir = repo_root / "client"

    if args.host != "127.0.0.1":
        _host_warning(args.host)

    # Step 2: Build React client if needed
    try:
        _build_client(client_dir)
    except subprocess.CalledProcessError as exc:
        print(f"\n  ✖  Client build failed: {exc}\n")
        sys.exit(1)

    # Step 3: Initialise DB
    from server.db.init_db import init_db
    init_db(cfg.DB_PATH)

    # Step 4+5: Discover metadata for banner
    games = _discover_games(repo_root)
    mcp_status = _check_mcp(repo_root)

    # Update config with CLI values
    cfg.HOST = args.host
    cfg.PORT = args.port
    cfg.OPEN_BROWSER = not args.no_browser

    # Step 6: Print banner
    _print_banner(args.host, args.port, repo_root, games, mcp_status)

    # Step 7: Open browser
    if not args.no_browser:
        url = f"http://{args.host}:{args.port}"
        time.sleep(1)
        webbrowser.open(url)

    # Step 5: Start uvicorn (blocking)
    import uvicorn
    uvicorn.run(
        "server.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )
