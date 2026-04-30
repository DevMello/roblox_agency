#!/usr/bin/env bash
# run-architect.sh
# Runs the Architect agent on a game spec to generate games/<game>/plan.md.
# Run this once after writing a new spec, or again after major spec changes.
#
# Usage:
#   ./scripts/run-architect.sh <game-name>
#
# Prerequisites:
#   - specs/<game-name>/spec.md must exist and be filled in
#   - claude CLI must be on PATH (run: claude --version to verify)

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
source "${REPO_ROOT}/scripts/run-agent.sh"

GAME="${1:?Usage: ./scripts/run-architect.sh <game-name>}"
SPEC_FILE="specs/${GAME}/spec.md"
PLAN_FILE="games/${GAME}/plan.md"
LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR" "games/${GAME}"

log() { echo "[$(date +%H:%M:%S)] $*"; }

# ─── Checks ──────────────────────────────────────────────────────────────────

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "ERROR: Spec not found at ${SPEC_FILE}"
  echo "Create it with: ./scripts/new-game.sh ${GAME}"
  exit 1
fi

if [[ -f "$PLAN_FILE" ]]; then
  log "Plan already exists at ${PLAN_FILE}"
  log "To regenerate, add REPLAN_REQUESTED to the top of the spec file, then rerun this script."
  grep -q "^REPLAN_REQUESTED" "$SPEC_FILE" || { log "No REPLAN_REQUESTED found — exiting."; exit 0; }
  log "REPLAN_REQUESTED detected — proceeding with replanning."
fi

log "=== Architect: ${GAME} ==="
log "Spec: ${SPEC_FILE}"
log "Output: ${PLAN_FILE}"
log ""
log "Running... (this typically takes 2-5 minutes)"

# ─── Invoke Architect ────────────────────────────────────────────────────────
#
# We give Claude three things:
#   1. CLAUDE.md  — repo-wide rules (agent permissions, off-limits files, etc.)
#   2. The Architect's AGENT.md — its full role spec
#   3. A clear task: which game, where the spec is, what to produce
#
# Claude Code will use its Read/Write tools to read the spec and prompts,
# then write plan.md and append to memory/decisions.md.

_ARCH_LOG="${LOG_DIR}/architect-${GAME}-$(date +%Y-%m-%d).log"
_ARCH_PROMPT="
Read CLAUDE.md first — it contains rules that apply to all agents.

You are the Architect agent. Read agents/architect/AGENT.md for your full role specification.

Your task:
- Game name: ${GAME}
- Spec file: ${SPEC_FILE}
- Output plan: ${PLAN_FILE}

Execute the Architect role exactly as described in your AGENT.md:
1. Read the spec at ${SPEC_FILE}
2. Use agents/architect/prompts/parse-spec.md to build the task tree
3. Use agents/architect/prompts/dependency-mapper.md to map dependencies
4. Use agents/architect/prompts/milestone-planner.md to group into milestones
5. Validate your output against agents/architect/schemas/task-tree.schema.json and agents/architect/schemas/milestone.schema.json
6. Write the complete plan to ${PLAN_FILE}
7. Append any significant architectural decisions to memory/decisions.md

Do not write any game source code. Do not call Roblox Studio MCP or Blender MCP.
"
run_agent "architect" "$_ARCH_PROMPT" "$_ARCH_LOG"

log ""
log "=== Architect complete ==="
log "Review your plan at: ${PLAN_FILE}"
log "Then run the night cycle: ./scripts/run-night-cycle.sh ${GAME}"
