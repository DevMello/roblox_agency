"""Server configuration — repo root resolution, env loading, port/host settings."""
from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Repo root detection
# ---------------------------------------------------------------------------

def _find_repo_root(start: Path | None = None) -> Path:
    """Walk up from start (default cwd) looking for the agency repo fingerprint."""
    candidate = start or Path.cwd()
    for p in [candidate, *candidate.parents]:
        if (p / "architecture.md").exists() and (p / "agents").is_dir():
            return p
    raise RuntimeError(
        f"Could not find repo root from {candidate!s}. "
        "Run 'agency' from inside the roblox_agency repo, "
        "or pass --repo <path>."
    )


def init(repo_override: str | None = None) -> None:
    """Called once at startup to set REPO_ROOT and load .env."""
    global REPO_ROOT, DB_PATH

    root = Path(repo_override).resolve() if repo_override else _find_repo_root()
    REPO_ROOT = root

    env_file = root / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    DB_PATH = root / "webui" / "server" / "db" / "agency.db"
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)


# Populated by init()
REPO_ROOT: Path = Path.cwd()
DB_PATH: Path = Path("webui/server/db/agency.db")

# ---------------------------------------------------------------------------
# Server settings (overridden by CLI flags)
# ---------------------------------------------------------------------------
HOST: str = os.getenv("AGENCY_HOST", "127.0.0.1")
PORT: int = int(os.getenv("AGENCY_PORT", "7432"))
OPEN_BROWSER: bool = True

# ---------------------------------------------------------------------------
# Claude API
# ---------------------------------------------------------------------------
ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

# ---------------------------------------------------------------------------
# Path security helpers
# ---------------------------------------------------------------------------

# Paths under repo root that the UI may NOT write to
WRITE_PROTECTED_DIRS: list[str] = [
    "agents",
    "scripts",
    ".github",
    "workflows",
    "specs",   # specs can be written, but only via the dedicated specs route
]

WRITE_PROTECTED_FILES: list[str] = [
    "CLAUDE.md",
    "architecture.md",
]

# Memory files the UI may append to (not full-write)
APPEND_ONLY_FILES: list[str] = [
    "memory/human-overrides.md",
    "memory/blockers.md",
    "memory/decisions.md",
]


def resolve_repo_path(rel_path: str) -> Path:
    """Resolve a relative path against REPO_ROOT; raise ValueError on traversal."""
    resolved = (REPO_ROOT / rel_path).resolve()
    if not resolved.is_relative_to(REPO_ROOT.resolve()):
        raise ValueError(f"Path traversal blocked: {rel_path!r}")
    return resolved


def is_write_allowed(rel_path: str) -> bool:
    """Return True if the UI is allowed to write to this path."""
    parts = Path(rel_path).parts
    if not parts:
        return False
    top = parts[0]
    if top in WRITE_PROTECTED_DIRS:
        return False
    if rel_path in WRITE_PROTECTED_FILES:
        return False
    return True
