#!/usr/bin/env bash
# launch-night-cycle.sh
# Runs one full night cycle: Planner generates the sprint, Builder executes it,
# Reporter writes the morning report.
#
# Usage:
#   ./scripts/launch-night-cycle.sh <game-name>
#   ./scripts/launch-night-cycle.sh          (runs for ALL games that have a plan.md)
#
# Prerequisites:
#   - claude CLI on PATH
#   - games/<game>/plan.md must exist (run run-architect.sh first)
#   - Roblox Studio open with MCP batch file at %LOCALAPPDATA%\Roblox\mcp.bat
#   - gh CLI authenticated (run: gh auth status)
#   - Local git repo initialised (Builder commits to branches)

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/night-cycle-$(date +%Y-%m-%d).log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

# ─── Determine which games to run ────────────────────────────────────────────

GAMES=()
if [[ $# -ge 1 ]]; then
  GAMES=("$@")
else
  # Auto-detect: any directory under games/ that has a plan.md
  for plan in games/*/plan.md; do
    [[ -f "$plan" ]] && GAMES+=("$(basename "$(dirname "$plan")")")
  done
fi

if [[ ${#GAMES[@]} -eq 0 ]]; then
  echo "ERROR: No games found with a plan.md. Run ./scripts/run-architect.sh <game-name> first."
  exit 1
fi

log "=== Night Cycle Start — $(date) ==="
log "Games: ${GAMES[*]}"

# ─── Pre-flight checks ───────────────────────────────────────────────────────

log "Pre-flight checks..."

STUDIO_OK=no
GITHUB_OK=no

# Check Roblox MCP via batch file presence (official Roblox MCP uses a bat file, not localhost)
ROBLOX_MCP_BAT="${LOCALAPPDATA}/Roblox/mcp.bat"
[[ -f "$ROBLOX_MCP_BAT" ]] && STUDIO_OK=yes || true
gh auth status >/dev/null 2>&1 && GITHUB_OK=yes || true

[[ "$STUDIO_OK" == "yes" ]] && log "  Roblox Studio MCP: bat file found OK" || log "  Roblox Studio MCP: bat file NOT found at ${ROBLOX_MCP_BAT} (Builder will mark scripting tasks blocked)"
[[ "$GITHUB_OK" == "yes" ]] && log "  GitHub CLI (gh): authenticated OK" || log "  GitHub CLI (gh): NOT AUTHENTICATED — run 'gh auth login' (Builder will commit locally only)"

# ─── Check for new specs that still need Architect ───────────────────────────

for spec_dir in specs/*/; do
  slug=$(basename "$spec_dir")
  [[ "$slug" == "template.md" ]] && continue
  spec_file="${spec_dir}spec.md"
  plan_file="games/${slug}/plan.md"
  if [[ -f "$spec_file" && ! -f "$plan_file" ]]; then
    log "New spec detected for '${slug}' — running Architect first..."
    bash "${REPO_ROOT}/scripts/run-architect.sh" "$slug" \
      || log "WARNING: Architect failed for '${slug}'. Skipping this game."
  fi
done

# ─── Step 1: Planner — Sprint Generation ─────────────────────────────────────

for GAME in "${GAMES[@]}"; do
  log ""
  log "--- Planner: generating sprint for ${GAME} ---"

  claude --dangerously-skip-permissions -p "
Read CLAUDE.md first.

You are the Planner agent. Read agents/planner/AGENT.md for your full role specification.

Your task: generate tonight's sprint for the game '${GAME}'.

Follow agents/planner/prompts/nightly-sprint.md exactly:
1. Run the override check using agents/planner/prompts/override-check.md
2. Read memory/blockers.md and exclude blocked tasks
3. Read games/${GAME}/plan.md and select tonight's tasks (fit within 288 estimated minutes)
4. Write the sprint to games/${GAME}/sprint-log.md

Also check for any open PRs that need triage: run 'gh pr list --label tbd-human --state open' and process each with the pr-triage prompt.
" 2>&1 | tee -a "$LOG_FILE"

  log "Sprint written for ${GAME}."
done

# ─── Step 2: Builder — Task Execution ────────────────────────────────────────

for GAME in "${GAMES[@]}"; do
  log ""
  log "--- Builder: executing sprint for ${GAME} ---"
  log "This may take a long time. Builder will work through all tasks in the sprint."

  claude --dangerously-skip-permissions -p "
Read CLAUDE.md first — follow all rules there absolutely.

You are the Builder agent. Read agents/builder/AGENT.md for your full role specification.

Your task: execute all pending tasks in tonight's sprint for game '${GAME}'.

Sprint log: games/${GAME}/sprint-log.md

For each task in the sprint (in order):
1. Read the task definition from the sprint log
2. Check that hard dependencies are satisfied
3. Use the appropriate prompt:
   - Feature tasks: agents/builder/prompts/feature-impl.md
   - Bug fixes:     agents/builder/prompts/bug-fix.md
   - Asset tasks:   agents/builder/prompts/asset-integration.md
4. Create a git branch, implement the task, commit, open a PR via gh CLI (or commit locally only if gh is not authenticated)
5. Update the task status in games/${GAME}/sprint-log.md to 'done'
6. Append an entry to games/${GAME}/progress.md

Continue until all tasks are done or you reach 3 failures on one task.
Do NOT modify plan.md, memory/decisions.md, memory/human-overrides.md, or any agent config file.

MCP / CLI availability:
- Roblox Studio MCP (bat file at %LOCALAPPDATA%/Roblox/mcp.bat): ${STUDIO_OK}
- GitHub CLI (gh): ${GITHUB_OK}
If Roblox Studio MCP is unavailable, mark scripting tasks blocked. If gh is not authenticated, commit locally but do not open PRs.
" 2>&1 | tee -a "$LOG_FILE"

  log "Builder finished for ${GAME}."
done

# ─── Step 3: Reporter — Morning Report ───────────────────────────────────────

log ""
log "--- Reporter: generating morning report ---"
bash "${REPO_ROOT}/scripts/launch-morning-report.sh" 2>&1 | tee -a "$LOG_FILE"

log ""
log "=== Night Cycle Complete — $(date) ==="
log "Log: ${LOG_FILE}"
log "Morning report: reports/morning/$(date +%Y-%m-%d).md"
