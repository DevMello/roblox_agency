#!/usr/bin/env bash
# apply-live-edit.sh
# Triggers a live edit: a human-requested immediate change to a game
# outside the night cycle. Takes the change request as an argument
# or prompts interactively.
#
# Usage:
#   ./scripts/apply-live-edit.sh "change request in plain language"
#   ./scripts/apply-live-edit.sh  (will prompt for input)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  echo "[$(date -u +%H:%M:%S UTC)] $*"
}

# ─── Get change request ──────────────────────────────────────────────────────

if [[ $# -ge 1 ]]; then
  CHANGE_REQUEST="$*"
else
  echo "Enter live edit request (be specific — vague requests will be flagged):"
  read -r CHANGE_REQUEST
fi

if [[ -z "$CHANGE_REQUEST" ]]; then
  echo "ERROR: No change request provided."
  exit 1
fi

# Basic ambiguity check — warn on very short or vague requests
WORD_COUNT=$(echo "$CHANGE_REQUEST" | wc -w)
if [[ $WORD_COUNT -lt 5 ]]; then
  echo "WARNING: Your request seems very short (${WORD_COUNT} words)."
  echo "Builder may flag this as too ambiguous. Consider being more specific."
  echo "Example: 'Change the dash cooldown in sword-game from 2 seconds to 1.5 seconds'"
  echo ""
  echo "Continue with: '${CHANGE_REQUEST}'? (y/n)"
  read -r CONFIRM
  [[ "$CONFIRM" != "y" ]] && { echo "Cancelled."; exit 0; }
fi

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
log "=== Live Edit Request ==="
log "Request: ${CHANGE_REQUEST}"
log "Timestamp: ${TIMESTAMP}"

# ─── Pre-flight: check GitHub MCP ────────────────────────────────────────────

GITHUB_STATUS=$(curl -sf http://localhost:3004/health 2>/dev/null || echo '{"status":"error"}')
GITHUB_OK=$(echo "$GITHUB_STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('status')=='ok' else 'no')" 2>/dev/null || echo 'no')

if [[ "$GITHUB_OK" == "no" ]]; then
  log "ERROR: GitHub MCP is unreachable. Cannot create branch or PR for live edit."
  log "Check that the GitHub MCP server is running on localhost:3004."
  exit 1
fi

# ─── Invoke Builder in live-edit mode ────────────────────────────────────────

log "Invoking Builder in live-edit mode..."
log "Builder will:"
log "  1. Write to memory/human-overrides.md BEFORE touching any code"
log "  2. Create a live/ branch"
log "  3. Implement the change"
log "  4. Open a PR labelled 'live-edit'"

claude --agent builder \
       --prompt "agents/builder/prompts/live-edit.md" \
       --input "${CHANGE_REQUEST}" \
       --context "memory/human-overrides.md,games/*/sprint-log.md,games/*/overrides.md" \
       --mode live-edit \
       --timestamp "$TIMESTAMP" \
  || { log "ERROR: Builder failed to apply live edit. Check memory/human-overrides.md for the logged request."; exit 1; }

log "Live edit applied. A PR has been opened and is awaiting QA review."
log "Review the PR in GitHub and merge when satisfied."
log "=== Live Edit Complete ==="
