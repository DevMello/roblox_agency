#!/usr/bin/env bash
# launch-weekly-research.sh
# Invokes the Market Researcher agent for the full weekly research
# and idea generation run.
#
# Usage:
#   ./scripts/launch-weekly-research.sh
#
# Prerequisites:
#   - claude CLI on PATH
#   - Chrome MCP running on localhost:3003 is strongly recommended
#     (Market Researcher uses it to browse Roblox charts and competitor pages)
#   - Internet access

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
source "${REPO_ROOT}/scripts/run-agent.sh"

YEAR_WEEK=$(date +%G-%V)
MARKET_REPORT="${REPO_ROOT}/reports/weekly/market-research/${YEAR_WEEK}.md"
IDEAS_REPORT="${REPO_ROOT}/reports/weekly/game-ideas/${YEAR_WEEK}.md"

LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR" \
         "${REPO_ROOT}/reports/weekly/market-research" \
         "${REPO_ROOT}/reports/weekly/game-ideas"
LOG_FILE="${LOG_DIR}/weekly-research-${YEAR_WEEK}.log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

# ─── Pre-flight ───────────────────────────────────────────────────────────────

CHROME_OK=no
curl -sf http://localhost:3003/health >/dev/null 2>&1 && CHROME_OK=yes || true

log "=== Weekly Research Run — Week ${YEAR_WEEK} ==="
[[ "$CHROME_OK" == "yes" ]] \
  && log "  Chrome MCP: OK" \
  || log "  Chrome MCP: NOT RUNNING (Market Researcher will use WebSearch instead)"

# ─── Run Market Researcher ───────────────────────────────────────────────────
#
# Market Researcher does all four steps (trending scan, revenue analysis,
# gap analysis, idea generation) in a single session so it can maintain
# context across phases. We pass it both output paths so it writes everything
# in one go rather than returning control between phases.

log ""
log "Running Market Researcher (this typically takes 60-90 minutes)..."
log "Reports will be written to:"
log "  ${MARKET_REPORT}"
log "  ${IDEAS_REPORT}"
log ""

_RESEARCHER_PROMPT="
Read CLAUDE.md first.

You are the Market Researcher agent. Read agents/market-researcher/AGENT.md for your full role specification.

Your task: run the full weekly research cycle for week ${YEAR_WEEK}.

Follow these steps in order. Use the prompt files listed for each step.

Step 1 — Trending scan (agents/market-researcher/prompts/trending-scan.md):
  Browse Roblox charts and identify the top trending games this week.
  Note genres, player counts, update frequency, and monetisation signals.
  Chrome MCP availability: ${CHROME_OK}
  If Chrome MCP is unavailable, use the WebSearch tool instead.

Step 2 — Revenue analysis (agents/market-researcher/prompts/revenue-analysis.md):
  For the top 10 trending games, estimate revenue signals:
  pass prices, gamepass names, developer product patterns, and UGC items.

Step 3 — Gap analysis (agents/market-researcher/prompts/gap-analysis.md):
  Read games/*/plan.md to understand what we are already building.
  Identify underserved niches: genres with demand but few quality options.
  Flag conflicts: do not recommend ideas that duplicate active games.

Step 4 — Idea generation (agents/market-researcher/prompts/idea-generation.md):
  Generate 3-5 concrete game ideas with full spec-ready fields:
    - Concept name and one-line pitch
    - Core game loop (30s / 5min / session)
    - Monetisation model
    - Estimated complexity (small / medium / large)
    - Why now (what market signal supports this)
    - Risks

Output:
  Write the full market research report (trending + revenue + gap findings) to:
    ${MARKET_REPORT}
  Write the game ideas report (idea cards only) to:
    ${IDEAS_REPORT}

Do not write any game source code. Do not modify any games/ or memory/ files.
"
run_agent "market-researcher" "$_RESEARCHER_PROMPT" "$LOG_FILE"

log ""
log "Market research report: ${MARKET_REPORT}"
log "Game ideas report:       ${IDEAS_REPORT}"
log "=== Weekly Research Run Complete ==="
