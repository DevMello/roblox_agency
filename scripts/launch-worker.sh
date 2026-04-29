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
#   - claude CLI on PATH
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

# ─── Load worker identity ─────────────────────────────────────────────────────

if [[ ! -f "$WORKER_ID_FILE" ]]; then
  echo "ERROR: No worker ID found at ${WORKER_ID_FILE}."
  echo "Run: bash scripts/register-worker.sh <your-machine-name>"
  exit 1
fi

WORKER_ID=$(cat "$WORKER_ID_FILE")
log "=== Worker Mode: ${WORKER_ID} ==="

# ─── MCP pre-flight ──────────────────────────────────────────────────────────

STUDIO_OK=no
GITHUB_OK=no
curl -sf http://localhost:3001/health >/dev/null 2>&1 && STUDIO_OK=yes || true
curl -sf http://localhost:3004/health >/dev/null 2>&1 && GITHUB_OK=yes || true

[[ "$STUDIO_OK" == "yes" ]] && log "  Roblox Studio MCP: OK" || log "  Roblox Studio MCP: NOT RUNNING"
[[ "$GITHUB_OK" == "yes" ]] && log "  GitHub MCP: OK"         || log "  GitHub MCP: NOT RUNNING (will use local git)"

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

wait_for_sprint() {
  while [[ $POLL_COUNT -lt $POLL_MAX ]]; do
    git pull --rebase origin main --quiet 2>/dev/null || true
    FOUND=0
    while IFS= read -r sprint_file; do
      [[ -f "$sprint_file" ]] || continue
      # Check sprint was written today and has assigned tasks
      FILE_DATE=$(date -r "$sprint_file" +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)
      TODAY=$(date +%Y-%m-%d)
      if [[ "$FILE_DATE" == "$TODAY" ]]; then
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
  exit 0
}

wait_for_sprint

# ─── Execute assigned tasks ───────────────────────────────────────────────────

while IFS= read -r SPRINT_LOG; do
  [[ -f "$SPRINT_LOG" ]] || continue

  # Extract game slug from path (games/<slug>/sprint-log.md)
  GAME=$(echo "$SPRINT_LOG" | sed 's|games/\([^/]*\)/sprint-log.md|\1|')

  log ""
  log "--- Worker ${WORKER_ID}: executing tasks for ${GAME} ---"

  # Update heartbeat
  mkdir -p "$HEARTBEAT_DIR"
  cat > "${HEARTBEAT_DIR}/${WORKER_ID}.md" << EOF
# Worker Heartbeat: ${WORKER_ID}

Last updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Current task: starting ${GAME}
Status: active
EOF
  git add "${HEARTBEAT_DIR}/${WORKER_ID}.md"
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
5. Create a git branch, implement the task, commit, open a PR (or local branch if no GitHub MCP)
6. Update the task status in ${SPRINT_LOG} to 'done'
7. Commit the sprint log update and push immediately: git push origin main (retry once if rejected with: git pull --rebase && git push)
8. Append an entry to games/${GAME}/progress.md
9. Write heartbeat: update memory/workers/${WORKER_ID}.md with current timestamp and task just completed. Commit and push.

Continue until all your assigned tasks are done or you reach 3 failures on one task.
Do NOT modify plan.md, memory/decisions.md, memory/human-overrides.md, or any agent config file.
Do NOT execute tasks assigned to other workers.

MCP availability:
- Roblox Studio MCP (localhost:3001): ${STUDIO_OK}
- GitHub MCP (localhost:3004): ${GITHUB_OK}
If a required MCP is unavailable, mark the task blocked in the sprint log and move to the next task.
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
git add "${HEARTBEAT_DIR}/${WORKER_ID}.md"
git diff --cached --quiet || {
  git commit -m "worker: ${WORKER_ID} night complete"
  git push origin main --quiet 2>/dev/null || true
}

log ""
log "=== Worker ${WORKER_ID} night cycle complete — $(date) ==="
log "Log: ${LOG_FILE}"
