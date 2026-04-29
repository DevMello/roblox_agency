#!/usr/bin/env bash
# launch-weekly-research.sh
# Invokes the Market Researcher agent for the full weekly research
# and idea generation run (Sunday 2 am ET).
# Can also be run manually: ./scripts/launch-weekly-research.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
YEAR_WEEK=$(date +%G-%V)  # ISO year-week, e.g. 2026-18
MARKET_REPORT="${REPO_ROOT}/reports/weekly/market-research/${YEAR_WEEK}.md"
IDEAS_REPORT="${REPO_ROOT}/reports/weekly/game-ideas/${YEAR_WEEK}.md"
TIME_LIMIT=7200  # 2 hours in seconds

log() {
  echo "[$(date -u +%H:%M:%S UTC)] $*"
}

log "=== Weekly Research Run — Week ${YEAR_WEEK} ==="
log "Time limit: 2 hours"

mkdir -p "${REPO_ROOT}/reports/weekly/market-research"
mkdir -p "${REPO_ROOT}/reports/weekly/game-ideas"

# Step 1: Trending Scan
log "Step 1: Trending scan..."
claude --agent market-researcher \
       --prompt "agents/market-researcher/prompts/trending-scan.md" \
       --output "/tmp/trending-scan-${YEAR_WEEK}.json" \
       --timeout 1800 \
  || { log "WARNING: Trending scan failed or timed out. Continuing with partial data."; }

# Step 2: Revenue Analysis
log "Step 2: Revenue analysis..."
claude --agent market-researcher \
       --prompt "agents/market-researcher/prompts/revenue-analysis.md" \
       --input "/tmp/trending-scan-${YEAR_WEEK}.json" \
       --output "/tmp/revenue-analysis-${YEAR_WEEK}.json" \
       --timeout 1200 \
  || { log "WARNING: Revenue analysis failed or timed out. Continuing with partial data."; }

# Step 3: Gap Analysis
log "Step 3: Gap analysis..."
claude --agent market-researcher \
       --prompt "agents/market-researcher/prompts/gap-analysis.md" \
       --input "/tmp/trending-scan-${YEAR_WEEK}.json,/tmp/revenue-analysis-${YEAR_WEEK}.json" \
       --context "games/" \
       --output "/tmp/gap-analysis-${YEAR_WEEK}.json" \
       --timeout 1200 \
  || { log "WARNING: Gap analysis failed or timed out. Continuing with partial data."; }

# Step 4: Idea Generation
log "Step 4: Idea generation..."
claude --agent market-researcher \
       --prompt "agents/market-researcher/prompts/idea-generation.md" \
       --input "/tmp/gap-analysis-${YEAR_WEEK}.json" \
       --output "$IDEAS_REPORT" \
       --timeout 1200 \
  || { log "WARNING: Idea generation failed or timed out."; }

# Write the combined market research report
log "Writing market research report..."
claude --agent market-researcher \
       --prompt "combine research outputs into market-research report" \
       --input "/tmp/trending-scan-${YEAR_WEEK}.json,/tmp/revenue-analysis-${YEAR_WEEK}.json,/tmp/gap-analysis-${YEAR_WEEK}.json" \
       --output "$MARKET_REPORT" \
       --timeout 600 \
  || { log "WARNING: Market research report assembly failed."; }

# Cleanup temp files
rm -f "/tmp/trending-scan-${YEAR_WEEK}.json" \
      "/tmp/revenue-analysis-${YEAR_WEEK}.json" \
      "/tmp/gap-analysis-${YEAR_WEEK}.json"

log "Market research report: ${MARKET_REPORT}"
log "Game ideas report: ${IDEAS_REPORT}"
log "=== Weekly Research Run Complete ==="
