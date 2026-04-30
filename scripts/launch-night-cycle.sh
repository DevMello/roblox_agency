#!/usr/bin/env bash
# launch-night-cycle.sh
# Coordinator mode: runs Planner (assigns tasks to workers), then Builder for
# this machine's tasks, then Reporter.
#
# Usage:
#   ./scripts/launch-night-cycle.sh [options] [game-name ...]
#
# Options:
#   --coordinator-only   Run Planner only (task assignment), then exit.
#                        Workers then run launch-worker.sh to pick up their tasks.
#
# Examples:
#   ./scripts/launch-night-cycle.sh sword-game       # single game, all phases
#   ./scripts/launch-night-cycle.sh                  # all games, all phases
#   ./scripts/launch-night-cycle.sh --coordinator-only sword-game  # planner only
#
# Multi-machine setup:
#   1. All machines: bash scripts/register-worker.sh <id>
#   2. Coordinator:  bash scripts/launch-night-cycle.sh [--coordinator-only]
#   3. Other workers: bash scripts/launch-worker.sh
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
source "${REPO_ROOT}/scripts/run-agent.sh"

LOG_DIR="${REPO_ROOT}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/night-cycle-$(date +%Y-%m-%d).log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

# ─── Parse flags ─────────────────────────────────────────────────────────────

COORDINATOR_ONLY=no
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--coordinator-only" ]]; then
    COORDINATOR_ONLY=yes
  else
    ARGS+=("$arg")
  fi
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
# Note: the expansion above is the safe empty-array idiom required under set -u.

# ─── Worker identity ─────────────────────────────────────────────────────────

WORKER_ID_FILE="${REPO_ROOT}/config/worker-id"
WORKER_ID="default"
if [[ -f "$WORKER_ID_FILE" ]]; then
  WORKER_ID=$(cat "$WORKER_ID_FILE")
fi

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
log "Games:         ${GAMES[*]}"
log "Worker ID:     ${WORKER_ID}"
log "Coordinator only: ${COORDINATOR_ONLY}"

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

  _PLANNER_PROMPT="
Read CLAUDE.md first.

You are the Planner agent. Read agents/planner/AGENT.md for your full role specification.

Your task: generate tonight's sprint for the game '${GAME}'.

Follow agents/planner/prompts/nightly-sprint.md exactly:
1. Run the override check using agents/planner/prompts/override-check.md
2. Read memory/blockers.md and exclude blocked tasks
3. Read games/${GAME}/plan.md and select tonight's tasks (fit within 288 estimated minutes)
4. Run Step 5.5 — worker assignment using agents/planner/prompts/worker-assignment.md
   Read memory/workers.md to find available workers (last_seen within 2 hours, status active).
   Assign worker_id to each task and set active_workers on the sprint.
   If no active workers found, set worker_id: null on all tasks (single-machine mode).
5. Write the sprint to games/${GAME}/sprint-log.md
6. Commit the sprint log and push: git add games/${GAME}/sprint-log.md && git commit -m '[${GAME}] plan: nightly sprint $(date +%Y-%m-%d)' && git push origin main

Also check for any open PRs that need triage: run 'gh pr list --label tbd-human --state open' and process each with the pr-triage prompt.
"
  run_agent "planner" "$_PLANNER_PROMPT" "$LOG_FILE"

  log "Sprint written for ${GAME}."
done

# ─── Coordinator-only exit ────────────────────────────────────────────────────

if [[ "$COORDINATOR_ONLY" == "yes" ]]; then
  log ""
  log "=== Coordinator-only mode: Planner phase complete ==="
  log "Sprint logs have been written and pushed. Workers can now run:"
  log "  bash scripts/launch-worker.sh"
  log ""
  log "Log: ${LOG_FILE}"
  exit 0
fi

# ─── Step 2: Builder — Task Execution ────────────────────────────────────────

for GAME in "${GAMES[@]}"; do
  log ""
  log "--- Builder: executing sprint for ${GAME} ---"
  log "This may take a long time. Builder will work through all tasks in the sprint."

  _BUILDER_PROMPT="
Read CLAUDE.md first — follow all rules there absolutely.

You are the Builder agent running as worker '${WORKER_ID}'. Read agents/builder/AGENT.md for your full role specification.

Your task: execute tasks assigned to worker '${WORKER_ID}' in tonight's sprint for game '${GAME}'.

Sprint log: games/${GAME}/sprint-log.md
Your worker ID: ${WORKER_ID}

IMPORTANT: Only execute tasks where worker_id == '${WORKER_ID}' OR where worker_id is null (single-machine mode). Skip tasks assigned to other workers.

For each task assigned to you (in order):
1. Pull from git: git pull --rebase origin main  (pick up completions from other workers)
2. Read the task definition from the sprint log
3. Check that hard dependencies are satisfied (deps may be done by other workers — check their status)
   - If a hard dependency is not yet done and is on another worker: wait up to 30 min (pull every 2 min)
4. Use the appropriate prompt:
   - Feature tasks: agents/builder/prompts/feature-impl.md
   - Bug fixes:     agents/builder/prompts/bug-fix.md
   - Asset tasks:   agents/builder/prompts/asset-integration.md
5. Create a git branch, implement the task, commit, open a PR via gh CLI (or commit locally only if gh is not authenticated)
6. Update the task status in games/${GAME}/sprint-log.md to 'done'
7. Push sprint log update immediately: commit and git push origin main (pull --rebase if rejected)
8. Append an entry to games/${GAME}/progress.md
9. Write heartbeat to memory/workers/${WORKER_ID}.md with current timestamp. Commit and push.

Continue until all your assigned tasks are done or you reach 3 failures on one task.
Do NOT modify plan.md, memory/decisions.md, memory/human-overrides.md, or any agent config file.

MCP / CLI availability:
- Roblox Studio MCP (bat file at %LOCALAPPDATA%/Roblox/mcp.bat): ${STUDIO_OK}
- GitHub CLI (gh): ${GITHUB_OK}
If Roblox Studio MCP is unavailable, mark scripting tasks blocked. If gh is not authenticated, commit locally but do not open PRs.
"
  run_agent "builder" "$_BUILDER_PROMPT" "$LOG_FILE"

  log "Builder finished for ${GAME}."
done

# ─── Step 2.5: QA — Validate Builder PRs ─────────────────────────────────────

for GAME in "${GAMES[@]}"; do
  log ""
  log "--- QA: validating sprint PRs for ${GAME} ---"

  _QA_PROMPT="
Read CLAUDE.md first and follow every absolute rule in it without exception.

You are the QA agent. Read agents/qa/AGENT.md for your full role specification.

Your task: run QA on every open PR opened by Builder during tonight's sprint for game '${GAME}'.

1. Read games/${GAME}/sprint-log.md. Find all tasks with status 'done' that reference a PR number.
2. For each such PR:
   a. Check labels: gh pr view {pr_number} --json labels -q '.labels[].name'
      Skip any PR already labelled 'qa-approved' or 'qa-failed'.
   b. Run all checks in sequence (stop at Check 1 if it has a blocking failure, but note the skip):
      - Luau lint:        agents/qa/checklists/luau-lint.md
      - Feature test:     agents/qa/prompts/feature-test.md
      - Regression check: agents/qa/prompts/regression-check.md
      - Playtest eval:    agents/qa/prompts/playtest-eval.md
        Roblox Studio MCP available: ${STUDIO_OK}
        If STUDIO_OK is 'no', skip playtest-eval and note it in the verdict.
   c. Apply the verdict:
      Approved: gh pr edit {pr_number} --add-label qa-approved
                gh pr comment {pr_number} --body 'QA approved. Ready to merge.\n\n{verdict}'
                Set qa_verdict='approved' in the sprint log for this task.
      Blocked:  gh pr edit {pr_number} --add-label qa-failed
                Comment with every failure listed (file, line, expected vs found).
                Set qa_verdict='blocked' and qa_notes with failure summary in the sprint log.
      Security or data-loss concern: also add label 'needs-human' regardless of verdict.
   d. Immediately push the sprint log after each verdict:
      git add games/${GAME}/sprint-log.md
      git commit -m '[${GAME}] qa: verdict for task {task_id}'
      git pull --rebase origin main && git push origin main

3. Process all PRs before stopping.
   Do NOT modify source files. Do NOT merge or close PRs.
   Do NOT write to plan.md, memory/, or any agent config file.
"
  run_agent "qa" "$_QA_PROMPT" "$LOG_FILE"

  log "QA finished for ${GAME}."
done

# ─── Step 3: Reporter — Morning Report ───────────────────────────────────────

log ""
log "--- Reporter: generating morning report ---"
bash "${REPO_ROOT}/scripts/launch-morning-report.sh" 2>&1 | tee -a "$LOG_FILE"

log ""
log "=== Night Cycle Complete — $(date) ==="
log "Log: ${LOG_FILE}"
log "Morning report: reports/morning/$(date +%Y-%m-%d).md"
