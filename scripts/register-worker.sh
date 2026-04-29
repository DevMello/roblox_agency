#!/usr/bin/env bash
# register-worker.sh
# Registers this machine as a worker in the agency's worker registry.
# Run this once on each machine before using it in the night cycle.
#
# Usage:
#   ./scripts/register-worker.sh <worker-id>
#   ./scripts/register-worker.sh           (prompts for ID)
#
# Worker ID rules: lowercase letters, numbers, hyphens only.
# Example: pranav-desktop, laptop-1, cloud-vm-us
#
# Prerequisites:
#   - bash (Windows: use Git Bash or WSL — not PowerShell or CMD)
#   - git on PATH
#   - Python 3 on PATH (command may be 'python3' or 'python' — detected automatically)
#   - curl on PATH (for MCP health checks)

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WORKER_ID_FILE="${REPO_ROOT}/config/worker-id"
REGISTRY="${REPO_ROOT}/memory/workers.md"
WORKERS_DIR="${REPO_ROOT}/memory/workers"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# ─── Detect Python 3 (portable: works on macOS, Linux, and Windows/Git Bash) ──
# On Windows the executable is often 'python' rather than 'python3'.

PYTHON=""
for _cmd in python3 python; do
  if command -v "$_cmd" >/dev/null 2>&1 \
      && "$_cmd" -c "import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)" 2>/dev/null; then
    PYTHON="$_cmd"
    break
  fi
done
if [[ -z "$PYTHON" ]]; then
  echo "ERROR: Python 3 is required but was not found on PATH."
  echo "       Install it from https://python.org and ensure it is accessible in this shell."
  exit 1
fi

# ─── Get or confirm worker ID ─────────────────────────────────────────────────

if [[ $# -ge 1 ]]; then
  NEW_ID="$1"
else
  if [[ -f "$WORKER_ID_FILE" ]]; then
    EXISTING=$(cat "$WORKER_ID_FILE")
    echo "This machine is already registered as: ${EXISTING}"
    echo "Re-register with a new ID? (leave blank to keep '${EXISTING}', or enter new ID)"
    read -r NEW_ID
    NEW_ID="${NEW_ID:-$EXISTING}"
  else
    echo "Enter a unique ID for this machine (e.g. pranav-desktop, laptop-1, cloud-vm-1):"
    read -r NEW_ID
  fi
fi

# Validate
if ! echo "$NEW_ID" | grep -qE '^[a-z0-9-]+$'; then
  echo "ERROR: Worker ID must be lowercase letters, numbers, and hyphens only."
  echo "       Got: '${NEW_ID}'"
  exit 1
fi

# ─── Save local worker ID (gitignored) ───────────────────────────────────────

mkdir -p "$(dirname "$WORKER_ID_FILE")"
echo "$NEW_ID" > "$WORKER_ID_FILE"
log "Worker ID saved locally: ${NEW_ID}"

# ─── Check MCP capabilities ──────────────────────────────────────────────────

STUDIO_CAP=no
GITHUB_CAP=no
curl -sf http://localhost:3001/health >/dev/null 2>&1 && STUDIO_CAP=yes || true
curl -sf http://localhost:3004/health >/dev/null 2>&1 && GITHUB_CAP=yes || true

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ─── Update memory/workers.md ────────────────────────────────────────────────

# Pull latest before editing the registry
git pull --rebase origin main 2>/dev/null || true

# Remove existing entry for this worker ID if present (re-registration)
if grep -q "^## Worker: ${NEW_ID}$" "$REGISTRY" 2>/dev/null; then
  log "Updating existing entry for ${NEW_ID}..."
  # Remove the old block (from ## Worker: ID to the next ## Worker: or end of file)
  "$PYTHON" - "$REGISTRY" "$NEW_ID" <<'PYEOF'
import sys, re
path, wid = sys.argv[1], sys.argv[2]
with open(path) as f:
    content = f.read()
# Remove block for this worker. Use MULTILINE so ^ anchors to line start,
# and handle entries that may appear first in the file (no preceding newline).
pattern = r'(?:^|\n)## Worker: ' + re.escape(wid) + r'\n.*?(?=\n## Worker: |\Z)'
content = re.sub(pattern, '', content, flags=re.DOTALL | re.MULTILINE)
with open(path, 'w') as f:
    f.write(content)
PYEOF
fi

# Append the updated entry
cat >> "$REGISTRY" << EOF

## Worker: ${NEW_ID}
ID: ${NEW_ID}
Registered: ${TIMESTAMP}
Last seen: ${TIMESTAMP}
Status: active
Capabilities:
  - studio-mcp: ${STUDIO_CAP}
  - github-mcp: ${GITHUB_CAP}
EOF

# ─── Create per-worker heartbeat file ────────────────────────────────────────

mkdir -p "$WORKERS_DIR"
cat > "${WORKERS_DIR}/${NEW_ID}.md" << EOF
# Worker Heartbeat: ${NEW_ID}

Last updated: ${TIMESTAMP}
Current task: idle
Status: registered
EOF

# ─── Commit and push ─────────────────────────────────────────────────────────

git add "$REGISTRY" "${WORKERS_DIR}/${NEW_ID}.md"
git diff --cached --quiet && { log "No registry changes to commit."; exit 0; }
git commit -m "worker: register ${NEW_ID}"
git push origin main

log ""
log "=== Worker '${NEW_ID}' registered ==="
log "Capabilities: Studio MCP=${STUDIO_CAP}, GitHub MCP=${GITHUB_CAP}"
log ""
log "On this machine (coordinator + worker):"
log "  bash scripts/launch-night-cycle.sh <game-name>"
log ""
log "On this machine (worker only):"
log "  bash scripts/launch-worker.sh"
