#!/bin/bash
# WebUI Launcher for macOS/Linux

set -e

NO_BROWSER=false
PORT=7432
FRONTEND_PORT=5173

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-browser)
      NO_BROWSER=true
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --frontend-port)
      FRONTEND_PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Find repo root
find_repo_root() {
  local current="$(pwd)"
  while [[ "$current" != "/" ]]; do
    if [[ -d "$current/.git" ]]; then
      echo "$current"
      return
    fi
    current="$(dirname "$current")"
  done
  echo ""
}

REPO_ROOT=$(find_repo_root)
if [[ -z "$REPO_ROOT" ]]; then
  echo "Error: Could not find repo root"
  exit 1
fi

WEBUI_DIR="$REPO_ROOT/webui"
SERVER_DIR="$WEBUI_DIR/server"
CLIENT_DIR="$WEBUI_DIR/client"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║         ROBLOX AGENCY WEBUI LAUNCHER              ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Checking environment...${NC}"

# Check directories
for name path in \
  "Repo root" "$REPO_ROOT" \
  "WebUI" "$WEBUI_DIR" \
  "Backend" "$SERVER_DIR" \
  "Frontend" "$CLIENT_DIR"
do
  if [[ -d "$path" ]]; then
    echo -e "  ${GREEN}✓${NC} $name"
  else
    echo -e "  ${RED}✗${NC} $name not found: $path"
    exit 1
  fi
done

# Check Python
if python3 --version > /dev/null 2>&1; then
  PYTHON_VER=$(python3 --version 2>&1)
  echo -e "  ${GREEN}✓${NC} Python: $PYTHON_VER"
else
  echo -e "  ${RED}✗${NC} Python not found"
  exit 1
fi

# Check Node
if node --version > /dev/null 2>&1; then
  NODE_VER=$(node --version 2>&1)
  echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VER"
else
  echo -e "  ${RED}✗${NC} Node.js not found"
  exit 1
fi

# Check npm
if npm --version > /dev/null 2>&1; then
  NPM_VER=$(npm --version 2>&1)
  echo -e "  ${GREEN}✓${NC} npm: $NPM_VER"
else
  echo -e "  ${RED}✗${NC} npm not found"
  exit 1
fi

echo ""
echo -e "${CYAN}Starting servers...${NC}"

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down servers...${NC}"
  if [[ ! -z "$BACKEND_PID" ]]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [[ ! -z "$FRONTEND_PID" ]]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  echo -e "${GREEN}Goodbye! 👋${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "  ${CYAN}→${NC} Backend on http://127.0.0.1:$PORT"
cd "$REPO_ROOT"
python3 -m uvicorn webui.server.main:app --host 127.0.0.1 --port $PORT --reload > /tmp/webui-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "  ${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"

# Wait for backend ready
echo -n "  Waiting for backend..."
for i in {1..10}; do
  if curl -s http://127.0.0.1:$PORT/api/v1/games/ > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# Start frontend
echo -e "  ${CYAN}→${NC} Frontend on http://127.0.0.1:$FRONTEND_PORT"
cd "$CLIENT_DIR"
npm run dev -- --host 127.0.0.1 --port $FRONTEND_PORT > /tmp/webui-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "  ${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"

echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║              SERVERS RUNNING                      ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Backend API:    http://127.0.0.1:$PORT/api/v1/${NC}"
echo -e "  ${CYAN}Frontend:       http://127.0.0.1:$FRONTEND_PORT${NC}"
echo -e "  ${CYAN}WebSocket:      ws://127.0.0.1:$PORT/ws${NC}"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop gracefully${NC}"
echo ""

# Open browser (macOS only)
if [[ "$NO_BROWSER" != "true" ]]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -n "  Opening browser..."
    sleep 2
    open "http://127.0.0.1:$FRONTEND_PORT"
    echo -e " ${GREEN}✓${NC}"
    echo ""
  fi
fi

# Wait for processes
while true; do
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${YELLOW}Backend stopped.${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    break
  fi
  if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${YELLOW}Frontend stopped.${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    break
  fi
  sleep 1
done

cleanup
