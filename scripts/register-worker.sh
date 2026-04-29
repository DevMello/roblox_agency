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

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WORKER_ID_FILE="${REPO_ROOT}/config/worker-id"
REGISTRY="${REPO_ROOT}/memory/workers.md"
WORKERS_DIR="${REPO_ROOT}/memory/workers"

log() { echo "[$(date +%H:%M:%S)] $*"; }

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
  python3 - "$REGISTRY" "$NEW_ID" <<'PYEOF'
import sys, re
path, wid = sys.argv[1], sys.argv[2]
with open(path) as f:
    content = f.read()
# Remove block for this worker
pattern = r'\n## Worker: ' + re.escape(wid) + r'\n.*?(?=\n## Worker: |\Z)'
content = re.sub(pattern, '', content, flags=re.DOTALL)
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
