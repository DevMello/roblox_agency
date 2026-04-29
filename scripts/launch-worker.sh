#!/usr/bin/env bash
# launch-worker.sh
# Worker mode: polls for tonight's sprint, then executes all tasks assigned
# to this machine. Run this on every non-coordinator machine.
#
# Usage:
#   ./scripts/launch-worker.sh
#   ./scripts/launch-worker.sh <game-name>   (run for one specific game only)
#
# Prerequisites:
#   - bash (Windows: use Git Bash or WSL — not PowerShell or CMD)
#   - claude CLI on PATH
#   - git on PATH, configured to access the shared remote
#   - Python 3 on PATH (command may be 'python3' or 'python' — detected automatically)
#   - register-worker.sh must have been run at least once (creates config/worker-id)
#   - Same git remote as the coordinator machine

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WORKER_ID_FILE="${REPO_ROOT}/config/worker-id"
HEARTBEAT_DIR="${REPO_ROOT}/memory/workers"

LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/worker-$(date +%Y-%m-%d).log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

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

# ─── Load worker identity ─────────────────────────────────────────────────────

if [[ ! -f "$WORKER_ID_FILE" ]]; then
  echo "ERROR: No worker ID found at ${WORKER_ID_FILE}."
  echo "Run: bash scripts/register-worker.sh <your-machine-name>"
  exit 1
fi

WORKER_ID=$(cat "$WORKER_ID_FILE")
REGISTRY="${REPO_ROOT}/memory/workers.md"
log "=== Worker Mode: ${WORKER_ID} ==="

# ─── MCP pre-flight ──────────────────────────────────────────────────────────

STUDIO_OK=no
GITHUB_OK=no
curl -sf http://localhost:3001/health >/dev/null 2>&1 && STUDIO_OK=yes || true
gh auth status >/dev/null 2>&1 && GITHUB_OK=yes || true

[[ "$STUDIO_OK" == "yes" ]] && log "  Roblox Studio MCP: OK"  || log "  Roblox Studio MCP: NOT RUNNING"
[[ "$GITHUB_OK" == "yes" ]] && log "  GitHub CLI (gh): authenticated OK" || log "  GitHub CLI (gh): NOT AUTHENTICATED — run 'gh auth login' (will commit locally only)"

# ─── Determine target games ───────────────────────────────────────────────────

TARGET_GAME="${1:-}"

# ─── Poll for sprint log ──────────────────────────────────────────────────────
#
# Wait until the coordinator's Planner has written and pushed a sprint log with
# status "running" or "planned". Poll every 60 seconds for up to 30 minutes.

log ""
log "Waiting for coordinator to generate sprint log..."

POLL_MAX=30      # max polling attempts
POLL_INTERVAL=60 # seconds between polls
POLL_COUNT=0

find_sprint_logs() {
  if [[ -n "$TARGET_GAME" ]]; then
    echo "games/${TARGET_GAME}/sprint-log.md"
  else
    ls games/*/sprint-log.md 2>/dev/null || true
  fi
}

# Return the sprint's date field from the JSON, or empty string on failure.
sprint_json_date() {
  "$PYTHON" -c "
import json, sys
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
    print(d.get('date', ''))
except Exception:
    pass
" "$1" 2>/dev/null || true
}

# Update the Last seen: line for WORKER_ID in memory/workers.md.
update_registry_last_seen() {
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  [[ -f "$REGISTRY" ]] || return 0
  "$PYTHON" - "$REGISTRY" "$WORKER_ID" "$ts" <<'PYEOF'
import sys, re
path, wid, ts = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    content = f.read()
# Replace 'Last seen: <value>' inside this worker's block only.
def replace_last_seen(m):
    block = m.group(0)
    block = re.sub(r'(Last seen: ).*', r'\g<1>' + ts, block)
    return block
pattern = r'## Worker: ' + re.escape(wid) + r'\b.*?(?=\n## Worker: |\Z)'
content = re.sub(pattern, replace_last_seen, content, flags=re.DOTALL)
with open(path, 'w') as f:
    f.write(content)
PYEOF
}

wait_for_sprint() {
  while [[ $POLL_COUNT -lt $POLL_MAX ]]; do
    git pull --rebase origin main --quiet 2>/dev/null || true
    FOUND=0
    TODAY=$(date +%Y-%m-%d)
    while IFS= read -r sprint_file; do
      [[ -f "$sprint_file" ]] || continue
      # Read the date from the sprint JSON itself — mtime is unreliable after git pull.
      SPRINT_DATE=$(sprint_json_date "$sprint_file")
      if [[ "$SPRINT_DATE" == "$TODAY" ]]; then
        # Check if any task is assigned to this worker
        if grep -q "\"worker_id\": \"${WORKER_ID}\"" "$sprint_file" 2>/dev/null; then
          FOUND=1
          break
        fi
      fi
    done < <(find_sprint_logs)

    if [[ $FOUND -eq 1 ]]; then
      log "Sprint log found with tasks for worker '${WORKER_ID}'."
      return 0
    fi

    POLL_COUNT=$((POLL_COUNT + 1))
    log "  [${POLL_COUNT}/${POLL_MAX}] No tasks assigned yet. Waiting ${POLL_INTERVAL}s..."
    sleep "$POLL_INTERVAL"
  done

  log "WARNING: Timed out waiting for sprint log. Either:"
  log "  - The coordinator has not run launch-night-cycle.sh yet"
  log "  - No tasks were assigned to worker '${WORKER_ID}' tonight"
  log "  - The coordinator is running in single-machine mode (no workers registered)"
  exit 1
}

wait_for_sprint

# ─── Execute assigned tasks ───────────────────────────────────────────────────

while IFS= read -r SPRINT_LOG; do
  [[ -f "$SPRINT_LOG" ]] || continue

  # Extract game slug from path (games/<slug>/sprint-log.md)
  GAME=$(echo "$SPRINT_LOG" | sed 's|games/\([^/]*\)/sprint-log.md|\1|')

  log ""
  log "--- Worker ${WORKER_ID}: executing tasks for ${GAME} ---"

  # Update heartbeat and refresh Last seen: in the worker registry
  mkdir -p "$HEARTBEAT_DIR"
  cat > "${HEARTBEAT_DIR}/${WORKER_ID}.md" << EOF
# Worker Heartbeat: ${WORKER_ID}

Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Current task: starting ${GAME}
Status: active
EOF
  update_registry_last_seen
  git add "${HEARTBEAT_DIR}/${WORKER_ID}.md" "$REGISTRY"
  git diff --cached --quiet || git commit -m "worker: ${WORKER_ID} starting ${GAME}"
  git push origin main --quiet 2>/dev/null || true

  # Invoke Builder for this worker's tasks only
  claude --dangerously-skip-permissions -p "
Read CLAUDE.md first — follow all rules there absolutely.

You are the Builder agent running as worker '${WORKER_ID}'. Read agents/builder/AGENT.md for your full role specification.

Your task: execute tasks assigned to worker '${WORKER_ID}' in tonight's sprint for game '${GAME}'.

Sprint log: ${SPRINT_LOG}
Your worker ID: ${WORKER_ID}

IMPORTANT: Only execute tasks where worker_id == '${WORKER_ID}'. Skip any task assigned to a different worker. If worker_id is null on all tasks, execute all tasks (single-machine fallback mode).

For each task assigned to you (in order):
1. Pull from git: git pull --rebase origin main  (pick up completions from other workers)
2. Read the task definition from the sprint log
3. Check that hard dependencies are satisfied (deps may be done by other workers — check their status in the sprint log after pulling)
   - If a hard dependency is not yet done: wait up to 30 minutes (pull every 2 min). If still not done after 30 min, mark this task blocked with reason 'cross-worker dependency stalled'
4. Use the appropriate prompt:
   - Feature tasks: agents/builder/prompts/feature-impl.md
   - Bug fixes:     agents/builder/prompts/bug-fix.md
   - Asset tasks:   agents/builder/prompts/asset-integration.md
5. Create a git branch, implement the task, commit, open a PR via gh CLI (or commit locally only if gh is not authenticated)
6. Update the task status in ${SPRINT_LOG} to 'done'
7. Commit the sprint log update and push immediately: git push origin main (retry once if rejected with: git pull --rebase && git push)
8. Append an entry to games/${GAME}/progress.md
9. Write heartbeat: update memory/workers/${WORKER_ID}.md with current timestamp and task just completed. Also update the Last seen: line for this worker in memory/workers.md (use the same Python helper as register-worker.sh). Commit and push both files.

Continue until all your assigned tasks are done or you reach 3 failures on one task.
Do NOT modify plan.md, memory/decisions.md, memory/human-overrides.md, or any agent config file.
Do NOT execute tasks assigned to other workers.

MCP / CLI availability:
- Roblox Studio MCP (localhost:3001): ${STUDIO_OK}
- GitHub CLI (gh): ${GITHUB_OK}
If Roblox Studio MCP is unavailable, mark scripting tasks blocked. If gh is not authenticated, commit locally but do not open PRs.
" 2>&1 | tee -a "$LOG_FILE"

  log "Worker ${WORKER_ID} finished tasks for ${GAME}."

done < <(find_sprint_logs)

# ─── Final heartbeat ──────────────────────────────────────────────────────────

mkdir -p "$HEARTBEAT_DIR"
cat > "${HEARTBEAT_DIR}/${WORKER_ID}.md" << EOF
# Worker Heartbeat: ${WORKER_ID}

Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Current task: idle
Status: complete
EOF
update_registry_last_seen
git add "${HEARTBEAT_DIR}/${WORKER_ID}.md" "$REGISTRY"
git diff --cached --quiet || {
  git commit -m "worker: ${WORKER_ID} night complete"
  git push origin main --quiet 2>/dev/null || true
}

log ""
log "=== Worker ${WORKER_ID} night cycle complete — $(date) ==="
log "Log: ${LOG_FILE}"
