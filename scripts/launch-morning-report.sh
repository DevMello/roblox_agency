#!/usr/bin/env bash
# launch-morning-report.sh
# Invokes the Reporter agent to generate today's morning report.
# Called automatically by launch-night-cycle.sh, or run manually.
#
# Usage:
#   ./scripts/launch-morning-report.sh
#   ./scripts/launch-morning-report.sh "abort reason text"   (when night cycle aborted early)
#
# Prerequisites:
#   - claude CLI on PATH
#   - games/*/sprint-log.md must exist (night cycle must have run)

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
source "${REPO_ROOT}/scripts/run-agent.sh"

TODAY=$(date +%Y-%m-%d)
REPORT_PATH="${REPO_ROOT}/reports/morning/${TODAY}.md"
ABORT_REASON="${1:-}"

LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR" "$(dirname "$REPORT_PATH")"
LOG_FILE="${LOG_DIR}/morning-report-${TODAY}.log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

log "=== Morning Report — ${TODAY} ==="

ABORT_CONTEXT=""
if [[ -n "$ABORT_REASON" ]]; then
  ABORT_CONTEXT="NOTE: The night cycle was aborted early. Reason: ${ABORT_REASON}
Reflect this in the report — show partial completion, explain what did not run."
  log "Note: abort reason passed in — ${ABORT_REASON}"
fi

_REPORTER_PROMPT="
Read CLAUDE.md first.

You are the Reporter agent. Read agents/reporter/AGENT.md for your full role specification.

Your task: generate the morning report for ${TODAY}.

Follow agents/reporter/prompts/morning-digest.md exactly:
1. Read all games/*/sprint-log.md files to collect last night's results
2. Read memory/blockers.md for any active blockers to surface
3. Read memory/decisions.md for any new architectural decisions made
4. Read all games/*/progress.md for the append-only build history
5. Use agents/reporter/prompts/tonights-plan.md to add the 'Tonight's Plan' section
6. Write the complete report to ${REPORT_PATH}

${ABORT_CONTEXT}

Do not modify any sprint logs, plan files, or memory files.
Output path: ${REPORT_PATH}
"
run_agent "reporter" "$_REPORTER_PROMPT" "$LOG_FILE"

if [[ -f "$REPORT_PATH" ]]; then
  log "Morning report written to: ${REPORT_PATH}"
else
  log "WARNING: Reporter did not write a report to ${REPORT_PATH}. Check the log."
fi

log "=== Morning Report Complete ==="
