# Roblox Agency UI

A browser-based control plane for the autonomous Roblox Agency system.

## Quick Start

```bash
# From the repo root
pip install -e ./webui
agency
```

The `agency` command auto-detects the repo root, builds the React client if needed, and opens `http://127.0.0.1:7432` in your browser.

## Options

```
agency --port 7432          # default 7432
agency --host 0.0.0.0       # default 127.0.0.1 (add firewall rule if exposed)
agency --no-browser         # don't auto-open browser
agency --repo /path/to/repo # override repo root
agency --reload             # dev mode: uvicorn auto-reload
```

## Development

```bash
# Terminal 1 — backend with hot reload
cd webui
pip install -e .
agency --reload --no-browser

# Terminal 2 — frontend dev server with HMR
cd webui/client
npm install
npm run dev
# Open http://localhost:5173
```

## Architecture

```
webui/
├── bin/agency.py          CLI entry point
├── server/
│   ├── config.py          Repo root resolution, path security
│   ├── main.py            FastAPI app factory
│   ├── routes/            API endpoints (/api/v1/*)
│   ├── services/          Business logic (repo, git, process, scheduler, mcp)
│   ├── models/            Pydantic models
│   └── db/                SQLite schema (run history, schedules, UI comments)
└── client/                React + TypeScript + Vite frontend
    └── src/
        ├── pages/         One file per route
        ├── components/    Reusable UI (layout, markdown, run, git, ui)
        ├── store/         Zustand global state
        └── hooks/         Custom React hooks
```

## Tech Stack

**Backend**: Python 3.11, FastAPI, uvicorn, gitpython, APScheduler, watchdog, SQLite  
**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, CodeMirror 6

## Security

The server listens on `127.0.0.1` by default (local only). All file operations are
path-traversal protected and restricted write paths (`agents/`, `scripts/`, etc.)
cannot be modified through the API.
