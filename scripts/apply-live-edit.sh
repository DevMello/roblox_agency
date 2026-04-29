#!/usr/bin/env bash
# apply-live-edit.sh
# Triggers a live edit: a human-requested immediate change to a game
# outside the night cycle.
#
# Usage:
#   ./scripts/apply-live-edit.sh <game-name> "change request in plain language"
#   ./scripts/apply-live-edit.sh <game-name>    (will prompt for the request)
#
# Example:
#   ./scripts/apply-live-edit.sh sword-game "reduce dash cooldown from 2s to 1.5s"
#
# Prerequisites:
#   - claude CLI on PATH
#   - games/<game-name>/plan.md must exist
#   - Roblox Studio open with MCP batch file at %LOCALAPPDATA%\Roblox\mcp.bat

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GAME="${1:?Usage: ./scripts/apply-live-edit.sh <game-name> \"change request\"}"
shift

LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/live-edit-$(date +%Y-%m-%d-%H%M%S).log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

# ─── Get change request ──────────────────────────────────────────────────────

if [[ $# -ge 1 ]]; then
  CHANGE_REQUEST="$*"
else
  echo "Enter live edit request for '${GAME}' (be specific):"
  echo "Example: 'Change dash cooldown from 2s to 1.5s in the combat module'"
  read -r CHANGE_REQUEST
fi

if [[ -z "$CHANGE_REQUEST" ]]; then
  echo "ERROR: No change request provided."
  exit 1
fi

WORD_COUNT=$(echo "$CHANGE_REQUEST" | wc -w)
if [[ $WORD_COUNT -lt 5 ]]; then
  echo "WARNING: Request seems very short (${WORD_COUNT} words)."
  echo "Builder may flag this as ambiguous. Consider being more specific."
  echo ""
  echo "Continue with: '${CHANGE_REQUEST}'? (y/n)"
  read -r CONFIRM
  [[ "$CONFIRM" != "y" ]] && { echo "Cancelled."; exit 0; }
fi

if [[ ! -f "games/${GAME}/plan.md" ]]; then
  echo "ERROR: No plan.md found for '${GAME}'. Run run-architect.sh first."
  exit 1
fi

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

log "=== Live Edit Request ==="
log "Game:    ${GAME}"
log "Request: ${CHANGE_REQUEST}"
log "Time:    ${TIMESTAMP}"

# ─── Pre-flight ───────────────────────────────────────────────────────────────

STUDIO_OK=no
GITHUB_OK=no
# Check Roblox MCP via batch file presence (official Roblox MCP uses a bat file, not localhost)
ROBLOX_MCP_BAT="${LOCALAPPDATA}/Roblox/mcp.bat"
[[ -f "$ROBLOX_MCP_BAT" ]] && STUDIO_OK=yes || true
gh auth status >/dev/null 2>&1 && GITHUB_OK=yes || true

[[ "$STUDIO_OK" == "yes" ]] && log "  Roblox Studio MCP: bat file found OK" || log "  Roblox Studio MCP: bat file NOT found at ${ROBLOX_MCP_BAT} (scripting tasks will be blocked)"
[[ "$GITHUB_OK" == "yes" ]] && log "  GitHub CLI (gh): authenticated OK" || log "  GitHub CLI (gh): NOT AUTHENTICATED — run 'gh auth login'"

# ─── Invoke Builder in live-edit mode ────────────────────────────────────────

log ""
log "Invoking Builder for live edit..."
log "Builder will:"
log "  1. Log the request to memory/human-overrides.md FIRST"
log "  2. Create a live/${GAME}/... branch"
log "  3. Implement the change (following agents/builder/prompts/live-edit.md)"
log "  4. Commit and open a PR via gh CLI (or leave a local branch if gh is not authenticated)"
log ""

claude --dangerously-skip-permissions -p "
Read CLAUDE.md first — follow all rules absolutely.

You are the Builder agent. Read agents/builder/AGENT.md for your full role specification.
Then read agents/builder/prompts/live-edit.md and follow it exactly.

LIVE EDIT REQUEST
Game:      ${GAME}
Timestamp: ${TIMESTAMP}
Request:   ${CHANGE_REQUEST}

Steps:
1. Read memory/human-overrides.md and games/${GAME}/overrides.md
2. Append this live edit request to memory/human-overrides.md with status 'active'
3. Read games/${GAME}/plan.md and games/${GAME}/sprint-log.md for context
4. Create branch: live/${GAME}/$(echo "${CHANGE_REQUEST}" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-' | cut -c1-40)
5. Implement the change following agents/builder/prompts/live-edit.md
6. Commit with message: [${GAME}] live: ${CHANGE_REQUEST}
7. Open a PR labelled 'live-edit' via gh CLI (if gh is authenticated) or log the local branch name

MCP / CLI availability:
- Roblox Studio MCP (bat file at %LOCALAPPDATA%/Roblox/mcp.bat): ${STUDIO_OK}
- GitHub CLI (gh): ${GITHUB_OK}

If Studio MCP is unavailable and the change requires writing game scripts, mark it blocked
and explain what script changes would be needed so a human can apply them manually.
" 2>&1 | tee -a "$LOG_FILE"

log ""
log "Live edit complete. Check the branch/PR and review before merging."
log "Log: ${LOG_FILE}"
log "=== Live Edit Done ==="
