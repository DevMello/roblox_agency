#!/usr/bin/env bash
# launch-morning-report.sh
# Invokes the Reporter agent to generate today's morning report
# from last night's sprint logs and PR data.
# Called automatically by launch-night-cycle.sh at 5 am,
# or run manually: ./scripts/launch-morning-report.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TODAY=$(date +%Y-%m-%d)
REPORT_PATH="${REPO_ROOT}/reports/morning/${TODAY}.md"
ABORT_REASON="${1:-}"  # Optional: --abort-reason "description"

log() {
  echo "[$(date -u +%H:%M:%S UTC)] $*"
}

log "Generating morning report for ${TODAY}..."

# Collect context files for Reporter
CONTEXT_FILES=(
  "games/*/sprint-log.md"
  "memory/blockers.md"
  "memory/decisions.md"
)

# If called with an abort reason, pass it to Reporter as context
ABORT_FLAG=""
if [[ -n "$ABORT_REASON" ]]; then
  ABORT_FLAG="--abort-reason ${ABORT_REASON}"
  log "Note: Night cycle aborted — reason: ${ABORT_REASON}"
fi

# Invoke Reporter
claude --agent reporter \
       --prompt "agents/reporter/prompts/morning-digest.md agents/reporter/prompts/tonights-plan.md" \
       --template "agents/reporter/templates/morning-report.md" \
       --output "$REPORT_PATH" \
       --context "${CONTEXT_FILES[*]}" \
       $ABORT_FLAG \
  || { log "ERROR: Reporter failed to generate morning report."; exit 1; }

log "Morning report written to: ${REPORT_PATH}"

# Print the report path for GitHub Actions step summary
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "## Morning Report" >> "$GITHUB_STEP_SUMMARY"
  echo "Report path: \`${REPORT_PATH}\`" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  cat "$REPORT_PATH" >> "$GITHUB_STEP_SUMMARY"
fi
