# WebUI Launch Scripts

Two simple scripts to launch the complete Roblox Agency WebUI stack (backend + frontend).

## Quick Start

### Windows (PowerShell)
```powershell
cd webui
.\launch.ps1
```

### macOS / Linux (Bash)
```bash
cd webui
chmod +x launch.sh
./launch.sh
```

Both scripts will:
1. ✓ Validate your environment (Python, Node.js, npm)
2. ✓ Start the FastAPI backend on `http://127.0.0.1:7432`
3. ✓ Start the Vite frontend dev server on `http://127.0.0.1:5173`
4. ✓ Automatically open your browser (Windows/macOS)
5. ✓ Display connection URLs and status
6. ✓ Handle graceful shutdown (Ctrl+C)

## Usage Options

### Windows (PowerShell)
```powershell
# Start with default ports, open browser
.\launch.ps1

# Start but don't open browser
.\launch.ps1 -NoBrowser

# Use custom ports
.\launch.ps1 -Port 8000 -FrontendPort 3000
```

### macOS / Linux (Bash)
```bash
# Start with default ports, open browser
./launch.sh

# Start but don't open browser
./launch.sh --no-browser

# Use custom ports
./launch.sh --port 8000 --frontend-port 3000
```

## URLs

Once running, access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://127.0.0.1:5173 | Web UI (Vite dev server) |
| **Backend API** | http://127.0.0.1:7432/api/v1/ | REST API endpoints |
| **WebSocket** | ws://127.0.0.1:7432/ws | Live updates |
| **API Docs** | http://127.0.0.1:7432/docs | Swagger UI (FastAPI) |

## Features

### Backend (FastAPI)
- Auto-reload on code changes (`--reload`)
- REST API endpoints for games, specs, runs, git, schedule, config
- WebSocket support for live updates
- Interactive API docs at `/docs`

### Frontend (Vite)
- Hot module replacement (HMR) for instant dev updates
- TypeScript with strict type checking
- React Router for navigation
- Zustand for state management
- TailwindCSS for styling

## Stopping the Servers

**Press Ctrl+C** in the terminal to gracefully shutdown both servers.

The script will:
1. Capture the interrupt signal
2. Stop the backend process
3. Stop the frontend process
4. Exit cleanly

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Port already in use** | Use `--port` or `--frontend-port` to specify different ports |
| **Python not found** | Ensure Python 3.10+ is installed: `python --version` |
| **Node/npm not found** | Ensure Node.js 18+ is installed: `node --version` |
| **npm modules missing** | Run `npm install` in `webui/client/` first |
| **Backend won't start** | Check Python dependencies: `pip list | grep uvicorn` |
| **Frontend won't load** | Check browser console (F12) for errors; verify backend is running |
| **WebSocket connection fails** | Ensure backend is fully started; check Network tab in DevTools |

## Environment Requirements

- **Python**: 3.10+ (check: `python --version`)
- **Node.js**: 18+ (check: `node --version`)
- **npm**: 8+ (check: `npm --version`)
- **Git**: For the repo

## First-Time Setup

If you haven't set up dependencies yet:

```bash
# Install Python dependencies (from repo root)
pip install -e webui

# Install Node dependencies
cd webui/client
npm install
```

Then run the launcher script.

## Advanced Usage

### Run Frontend Only
```bash
cd webui/client
npm run dev -- --host 127.0.0.1 --port 5173
```

### Run Backend Only
```bash
python -m uvicorn webui.server.main:app --host 127.0.0.1 --port 7432 --reload
```

### Production Build
```bash
cd webui/client
npm run build        # Creates dist/ folder
npm run preview      # Serves production build locally
```

## What Each Script Does

### PowerShell (`launch.ps1`)
- Validates Python, Node.js, npm availability
- Starts backend with auto-reload
- Waits for backend to be ready (healthcheck)
- Starts frontend dev server
- Monitors both processes
- Opens browser automatically (unless `-NoBrowser`)
- Handles graceful shutdown

### Bash (`launch.sh`)
- Same functionality as PowerShell script
- Uses standard bash/sh (POSIX-compatible)
- Cross-platform (macOS, Linux, WSL)
- Uses standard signals (SIGINT, SIGTERM)

## Tips

1. **Keep a terminal open** while developing — both servers run in the same terminal
2. **Don't close the terminal** — it will stop both servers
3. **Ctrl+C to stop** — cleanly shuts down both processes
4. **Check browser console (F12)** if things aren't working
5. **Reload browser** (F5) if you see stale content

## Example Session

```
$ .\launch.ps1

╔═══════════════════════════════════════════════════╗
║         ROBLOX AGENCY WEBUI LAUNCHER              ║
╚═══════════════════════════════════════════════════╝

Checking environment...
  ✓ Repo root
  ✓ WebUI
  ✓ Backend
  ✓ Frontend
  ✓ Python: Python 3.10.9
  ✓ Node.js: v23.11.1
  ✓ npm: 10.8.3

Starting servers...
  → Backend on http://127.0.0.1:7432
  ✓ Backend started (PID: 12345)
  Waiting for backend... ✓
  → Frontend on http://127.0.0.1:5173
  ✓ Frontend started (PID: 12346)

╔═══════════════════════════════════════════════════╗
║              SERVERS RUNNING                      ║
╚═══════════════════════════════════════════════════╝

  Backend API:    http://127.0.0.1:7432/api/v1/
  Frontend:       http://127.0.0.1:5173
  WebSocket:      ws://127.0.0.1:7432/ws

  Press Ctrl+C to stop gracefully

  Opening browser... ✓

[Backend logs appear here...]
[Frontend logs appear here...]

^C
Shutting down servers...
Goodbye! 👋
```

---

**Questions?** Check the main README.md or review the individual script files for detailed logic.
