#!/bin/bash
# WebUI Launcher Script
# Usage: ./launch.sh [--no-browser] [--port PORT] [--frontend-port PORT]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Defaults
NO_BROWSER=false
BACKEND_PORT=7432
FRONTEND_PORT=5173

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-browser)
      NO_BROWSER=true
      shift
      ;;
    --port)
      BACKEND_PORT="$2"
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

# Get repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEBUI_DIR="$SCRIPT_DIR"
SERVER_DIR="$WEBUI_DIR/server"
CLIENT_DIR="$WEBUI_DIR/client"

# Clear screen
clear

# Header
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║         ROBLOX AGENCY WEBUI LAUNCHER              ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Validate environment
echo -e "${CYAN}Checking environment...${NC}"

check_dir() {
  if [ ! -d "$1" ]; then
    echo -e "  ${RED}✗ $2 not found: $1${NC}"
    exit 1
  fi
  echo -e "  ${GREEN}✓ $2${NC}"
}

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "  ${RED}✗ $1 not found${NC}"
    exit 1
  fi
  VERSION=$($1 --version 2>&1 | head -n1)
  echo -e "  ${GREEN}✓ $2: $VERSION${NC}"
}

check_dir "$REPO_ROOT" "Repo root"
check_dir "$WEBUI_DIR" "WebUI"
check_dir "$SERVER_DIR" "Backend"
check_dir "$CLIENT_DIR" "Frontend"
check_cmd python "Python"
check_cmd node "Node.js"
check_cmd npm "npm"

echo ""
echo -e "${CYAN}Starting servers...${NC}"

# Start backend
echo -e "  ${CYAN}→ Backend on http://127.0.0.1:$BACKEND_PORT${NC}"
cd "$REPO_ROOT"
python -m uvicorn webui.server.main:app --host 127.0.0.1 --port $BACKEND_PORT --reload &
BACKEND_PID=$!
echo -e "  ${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend
echo -n "  Waiting for backend to be ready..."
for i in {1..10}; do
  if curl -s http://127.0.0.1:$BACKEND_PORT/api/v1/games/ > /dev/null 2>&1; then
    echo -e " ${GREEN}✓${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# Start frontend
echo -e "  ${CYAN}→ Frontend on http://127.0.0.1:$FRONTEND_PORT${NC}"
cd "$CLIENT_DIR"
npm run dev -- --host 127.0.0.1 --port $FRONTEND_PORT &
FRONTEND_PID=$!
echo -e "  ${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║              SERVERS RUNNING                      ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Backend API:    http://127.0.0.1:$BACKEND_PORT/api/v1/${NC}"
echo -e "  ${CYAN}Frontend:       http://127.0.0.1:$FRONTEND_PORT${NC}"
echo -e "  ${CYAN}WebSocket:      ws://127.0.0.1:$BACKEND_PORT/ws${NC}"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop gracefully${NC}"
echo ""

# Open browser if not suppressed
if [ "$NO_BROWSER" = false ]; then
  echo "  Opening browser..."
  sleep 2
  if command -v xdg-open &> /dev/null; then
    xdg-open "http://127.0.0.1:$FRONTEND_PORT" &
  elif command -v open &> /dev/null; then
    open "http://127.0.0.1:$FRONTEND_PORT" &
  fi
  echo -e "  ${GREEN}✓${NC}"
fi

echo ""

# Cleanup on exit
trap "
  echo ''
  echo -e '${YELLOW}Shutting down servers...${NC}'
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e '${GREEN}Goodbye! 👋${NC}'
  exit 0
" SIGINT SIGTERM

# Wait for both processes
wait
