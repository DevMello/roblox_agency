"""MCP registry — read/write .mcp.json and health-check servers."""
from __future__ import annotations

import json
import socket
from pathlib import Path
from typing import Any


class MCPRegistry:
    # ------------------------------------------------------------------
    # Path helpers
    # ------------------------------------------------------------------

    def _mcp_path(self) -> Path:
        from webui.server import config as cfg

        return cfg.REPO_ROOT / ".mcp.json"

    # ------------------------------------------------------------------
    # Load / Save
    # ------------------------------------------------------------------

    def load(self) -> list[dict]:
        """Read .mcp.json and return a list of server dicts."""
        path = self._mcp_path()
        if not path.exists():
            return []

        with path.open("r", encoding="utf-8") as fh:
            raw: Any = json.load(fh)

        # .mcp.json can be either {"mcpServers": {name: cfg, ...}} or a
        # plain list.  Normalise everything to a list of dicts that
        # include the server's name.
        if isinstance(raw, dict):
            servers_map: dict = raw.get("mcpServers", raw)
            result: list[dict] = []
            for name, entry in servers_map.items():
                server = dict(entry)
                server.setdefault("name", name)
                result.append(server)
            return result

        if isinstance(raw, list):
            return raw

        return []

    def save(self, servers: list[dict]) -> None:
        """Write .mcp.json after validating structure."""
        self._validate(servers)

        # Serialise as the canonical {mcpServers: {name: cfg}} form
        servers_map: dict = {}
        for server in servers:
            name = server.get("name", "")
            if not name:
                raise ValueError("Each server entry must have a 'name' field.")
            entry = {k: v for k, v in server.items() if k != "name"}
            servers_map[name] = entry

        path = self._mcp_path()
        with path.open("w", encoding="utf-8") as fh:
            json.dump({"mcpServers": servers_map}, fh, indent=2)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def add_server(self, name: str, config: dict) -> None:
        """Add or update a single server entry by name."""
        servers = self.load()
        # Remove existing entry with the same name (update case)
        servers = [s for s in servers if s.get("name") != name]
        entry = dict(config)
        entry["name"] = name
        servers.append(entry)
        self.save(servers)

    def remove_server(self, name: str) -> bool:
        """Remove server by name.  Returns True if an entry was found."""
        servers = self.load()
        filtered = [s for s in servers if s.get("name") != name]
        if len(filtered) == len(servers):
            return False
        self.save(filtered)
        return True

    # ------------------------------------------------------------------
    # Health checks
    # ------------------------------------------------------------------

    def health_check(self, name: str) -> dict:
        """
        For type=stdio  : check whether the command/batch file exists on disk.
        For type=http/sse: try a TCP connect to host:port (1 s timeout).
        Returns {name, status: "up"|"down"|"unknown", detail: str}
        """
        servers = self.load()
        entry = next((s for s in servers if s.get("name") == name), None)
        if entry is None:
            return {"name": name, "status": "unknown", "detail": "Server not found in .mcp.json"}

        server_type: str = entry.get("type", "stdio").lower()

        if server_type == "stdio":
            return self._check_stdio(name, entry)

        if server_type in ("http", "sse"):
            return self._check_tcp(name, entry)

        return {"name": name, "status": "unknown", "detail": f"Unrecognised type '{server_type}'"}

    def health_check_all(self) -> list[dict]:
        """Run health_check for every configured server."""
        return [self.health_check(s["name"]) for s in self.load()]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _validate(self, servers: list[dict]) -> None:
        """Raise ValueError if any server entry is obviously malformed."""
        if not isinstance(servers, list):
            raise ValueError("servers must be a list of dicts.")
        for entry in servers:
            if not isinstance(entry, dict):
                raise ValueError(f"Each server entry must be a dict, got {type(entry)}.")

    def _check_stdio(self, name: str, entry: dict) -> dict:
        """Check that the command (batch file / executable) exists."""
        command: str = entry.get("command", "")
        if not command:
            return {"name": name, "status": "unknown", "detail": "No command specified."}

        cmd_path = Path(command)
        if cmd_path.exists():
            return {"name": name, "status": "up", "detail": f"Command exists: {command}"}

        return {
            "name": name,
            "status": "down",
            "detail": f"Command not found on disk: {command}",
        }

    def _check_tcp(self, name: str, entry: dict) -> dict:
        """Attempt a TCP connection to the server's host:port."""
        url: str = entry.get("url", "")
        args: list = entry.get("args", [])

        # Try to derive host / port from url or args
        host = "127.0.0.1"
        port: int | None = None

        if url:
            # Strip scheme (http:// / sse://)
            stripped = url.split("://", 1)[-1].rstrip("/")
            if ":" in stripped:
                host, port_str = stripped.rsplit(":", 1)
                try:
                    port = int(port_str.split("/")[0])
                except ValueError:
                    pass
            else:
                host = stripped

        # Fall back to scanning args for a bare integer port
        if port is None:
            for arg in args:
                try:
                    port = int(arg)
                    break
                except (TypeError, ValueError):
                    pass

        if port is None:
            return {"name": name, "status": "unknown", "detail": "Could not determine port."}

        try:
            with socket.create_connection((host, port), timeout=1.0):
                pass
            return {"name": name, "status": "up", "detail": f"TCP {host}:{port} reachable"}
        except OSError as exc:
            return {
                "name": name,
                "status": "down",
                "detail": f"TCP {host}:{port} unreachable: {exc}",
            }


mcp_registry = MCPRegistry()
