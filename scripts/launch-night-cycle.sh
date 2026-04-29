#!/usr/bin/env bash
# launch-night-cycle.sh
# Entrypoint for the full night cycle (11 pm – 5 am ET).
# Runs pre-flight checks, activates Architect for new specs,
# invokes Planner, then Builder, and monitors until the 5 am cutoff
# at which point it triggers the morning report.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${REPO_ROOT}/logs/night-cycle-$(date +%Y-%m-%d).log"
mkdir -p "${REPO_ROOT}/logs"

log() {
  echo "[$(date -u +%H:%M:%S UTC)] $*" | tee -a "$LOG_FILE"
}

# ─── Pre-flight checks ───────────────────────────────────────────────────────

log "=== Night Cycle Start ==="
log "Running pre-flight checks..."

# Check Roblox Studio MCP
STUDIO_STATUS=$(curl -sf http://localhost:3001/health 2>/dev/null || echo '{"status":"error"}')
STUDIO_OK=$(echo "$STUDIO_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('status')=='ok' and d.get('studio_open') else 'no')" 2>/dev/null || echo 'no')

# Check GitHub MCP
GITHUB_STATUS=$(curl -sf http://localhost:3004/health 2>/dev/null || echo '{"status":"error"}')
GITHUB_OK=$(echo "$GITHUB_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('status')=='ok' else 'no')" 2>/dev/null || echo 'no')

if [[ "$STUDIO_OK" == "no" && "$GITHUB_OK" == "no" ]]; then
  log "ERROR: Both Roblox Studio MCP and GitHub MCP are unreachable. Aborting night cycle."
  log "Reporter will flag this in the morning report."
  # Invoke reporter to generate an abort notice
  bash "${REPO_ROOT}/scripts/launch-morning-report.sh" --abort-reason "Pre-flight failed: all MCP servers unreachable"
  exit 1
fi

[[ "$STUDIO_OK" == "no" ]] && log "WARNING: Roblox Studio MCP is unreachable. Asset and scripting tasks may fail."
[[ "$GITHUB_OK" == "no" ]] && log "WARNING: GitHub MCP is unreachable. Commits and PRs will fail."

# ─── Detect new specs needing Architect ──────────────────────────────────────

log "Checking for new specs..."
for spec_dir in "${REPO_ROOT}/specs"/*/; do
  game_slug=$(basename "$spec_dir")
  [[ "$game_slug" == "template.md" ]] && continue  # skip the template file

  spec_file="${spec_dir}spec.md"
  plan_file="${REPO_ROOT}/games/${game_slug}/plan.md"

  if [[ -f "$spec_file" && ! -f "$plan_file" ]]; then
    log "New spec detected for '${game_slug}'. Activating Architect..."
    claude --agent architect \
           --prompt "agents/architect/AGENT.md" \
           --input "specs/${game_slug}/spec.md" \
           --output "games/${game_slug}/plan.md" \
      || log "WARNING: Architect failed for '${game_slug}'. Game will not be included in tonight's sprint."
  fi
done

# ─── Planner: Sprint Generation ──────────────────────────────────────────────

log "Activating Planner (sprint generation mode)..."
claude --agent planner \
       --prompt "agents/planner/prompts/nightly-sprint.md" \
       --context "memory/human-overrides.md,memory/blockers.md,memory/decisions.md" \
  || { log "ERROR: Planner sprint generation failed after retries. Aborting night cycle."; exit 1; }

log "Sprint generation complete."

# ─── Builder: Task Execution ─────────────────────────────────────────────────

log "Activating Builder..."
WIND_DOWN_TIME=$(date -d "+5 hours 45 minutes" +%s)  # 4:45 am (5h45m from 11pm)

claude --agent builder \
       --prompt "agents/builder/AGENT.md" \
       --deadline "$WIND_DOWN_TIME" \
       --context "games/*/sprint-log.md" \
  &
BUILDER_PID=$!

# ─── Planner: Monitoring Loop ────────────────────────────────────────────────

log "Starting Planner monitoring loop (every 30 minutes)..."
while kill -0 $BUILDER_PID 2>/dev/null; do
  sleep 1800  # 30 minutes
  if [[ $(date +%s) -ge $WIND_DOWN_TIME ]]; then
    log "Wind-down time reached. Signalling Builder to stop."
    kill -SIGTERM $BUILDER_PID 2>/dev/null || true
    break
  fi
  log "Planner monitoring pass at $(date +%H:%M)..."
  claude --agent planner \
         --prompt "agents/planner/prompts/replan-on-failure.md" \
         --context "games/*/sprint-log.md,memory/blockers.md" \
         --mode monitoring \
    || log "WARNING: Planner monitoring pass failed."
done

wait $BUILDER_PID 2>/dev/null || true
log "Builder has stopped."

# ─── Planner: Final Write ────────────────────────────────────────────────────

log "Planner writing final sprint status..."
claude --agent planner \
       --prompt "agents/planner/AGENT.md" \
       --mode finalize \
       --context "games/*/sprint-log.md,memory/" \
  || log "WARNING: Planner final write failed."

# ─── Reporter: Morning Report ────────────────────────────────────────────────

log "Triggering morning report..."
bash "${REPO_ROOT}/scripts/launch-morning-report.sh"

log "=== Night Cycle Complete ==="
