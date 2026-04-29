# Night Cycle Runbook

Authoritative step-by-step guide for what happens between 11 pm and 5 am. Any agent or human reading this should understand the full sequence without consulting any other file.

---

## Timeline Overview

```
11:00 pm  Pre-flight checks
11:05 pm  Planner: sprint generation
11:20 pm  Builder: task execution begins
11:20 pm  QA: standby (triggers on each new PR)
Every 30m  Planner: monitoring pass
 4:45 am  Builder: wind-down
 5:00 am  Planner: final status write
 5:00 am  Reporter: morning report generation
```

---

## Step 1: Pre-Flight Checks (11:00 pm)

The `scripts/launch-night-cycle.sh` script runs these checks before any agent activates:

1. **Roblox Studio MCP** — health check at `localhost:3001`. Must return `{ "status": "ok", "studio_open": true }`.
2. **GitHub MCP** — health check at `localhost:3004`. Must return a valid response.
3. **Active sprint log** — check that `games/{game-name}/sprint-log.md` exists for each active game (or will be created by Planner). If a game directory exists under `games/` but has no plan.md, flag it as needing Architect.
4. **New specs** — check for any file at `specs/{game-name}/spec.md` with no corresponding `games/{game-name}/plan.md`. If found, activate Architect for that game before continuing.

**If Roblox Studio MCP and GitHub MCP are both unreachable:** Abort the night cycle. Reporter will note the abort in the morning report.

**If only one is unreachable:** Log the issue and continue. Builder will hit the specific server failure when it reaches a task that requires it.

---

## Step 2: Architect Activation (if needed, 11:00–11:05 pm)

If a new spec was found in the pre-flight check:
1. Architect runs the `parse-spec`, `dependency-mapper`, and `milestone-planner` prompts in sequence.
2. Architect writes `games/{game-name}/plan.md`.
3. Architect writes to `memory/decisions.md`.
4. Night cycle proceeds once Architect completes.

If Architect fails, the new game is logged as not started. Planner generates a sprint only for existing games.

---

## Step 3: Planner — Sprint Generation (11:05–11:20 pm)

Planner runs the nightly-sprint prompt:
1. Runs the override-check prompt.
2. Reads `memory/blockers.md` and removes blocked tasks from the candidate pool.
3. Runs the pr-triage prompt on any open `tbd-human` PRs.
4. Reads `plan.md` for each active game and selects tonight's tasks.
5. Writes `games/{game-name}/sprint-log.md` for each active game.
6. Sets sprint status to `planned`.

If Planner fails after 2 retries: abort the night cycle. Reporter notes it in the morning report.

---

## Step 4: Builder and QA — Parallel Execution (11:20 pm – 4:45 am)

### Builder
- Reads `sprint-log.md` and begins the first task.
- For each task:
  1. Checks the sprint log for any Planner updates since last read.
  2. Verifies hard dependencies are merged via GitHub MCP.
  3. Implements the task (using `feature-impl`, `bug-fix`, or `asset-integration` prompt as appropriate).
  4. Commits and opens a PR (using `pr-creation` prompt).
  5. Updates the sprint log task status to `done`.
  6. Appends to `progress.md`.
  7. Moves to the next task.

- Builder does NOT wait for QA approval before moving to the next task. QA runs in parallel.
- Builder stops and marks the sprint status `running` when all tasks are attempted.

### QA
- Monitors for new PR comments containing "QA review requested."
- When triggered, runs `feature-test`, `regression-check`, and `playtest-eval` prompts in sequence.
- Applies `qa-approved` or `qa-failed` label to the PR.
- Updates the task's `qa_verdict` in the sprint log.
- Does not interrupt Builder.

### Builder handling QA failures
- If QA blocks a PR on a task Builder already completed, Builder does not immediately re-attempt.
- Planner will detect the `qa-failed` label on the next monitoring pass and issue a replan.

---

## Step 5: Planner Monitoring (every 30 minutes)

At 11:50 pm, 12:20 am, 12:50 am, etc., Planner runs a monitoring pass:
1. Reads the current sprint log.
2. Checks for replan triggers:
   - Any task marked `failed`.
   - Any task's `actual_minutes` > 2× `estimated_minutes` and still `in-progress`.
   - Any PR with `qa-failed` label that Builder has not yet addressed.
   - Any new entry in `memory/blockers.md`.
3. If no triggers: log a heartbeat note in the sprint, do nothing else.
4. If a trigger is detected: run the `replan-on-failure` prompt.

---

## Step 6: Error Handling

**If Builder crashes mid-task:**
- The last partial work is left uncommitted on the branch (or partially committed if Builder got that far).
- Planner detects no progress on the next monitoring pass and applies replan-on-failure.
- The morning report flags the crash.

**If QA is unreachable:**
- PRs accumulate with "QA review requested" comments but no QA response.
- Planner notes this on the next monitoring pass and adds a morning report flag.
- PRs are not auto-merged without a QA verdict.

**If a task exceeds 90 minutes with no completion:**
- Planner's monitoring pass detects this at the 2× estimate threshold.
- Planner issues a replan: typically skip the task and continue.

---

## Step 7: Wind-Down (4:45 am)

At 4:45 am, the night cycle script sends a wind-down signal to Builder:
1. Builder completes the line of code it is on, saves, and stops.
2. Builder commits partial work with a commit message starting with `[wip]`.
3. Builder opens a draft PR for the partial work (if not already open).
4. Builder sets the task status to `paused` in the sprint log.
5. Builder writes its final `progress.md` entry.

Builder does not start a new task after receiving the wind-down signal.

---

## Step 8: Planner Final Write (5:00 am)

Planner writes:
1. Final sprint status to `sprint-log.md` (`complete`, `partial`, or `failed`).
2. A brief summary paragraph in the sprint log.
3. Any new decisions or blockers to `memory/decisions.md` and `memory/blockers.md`.
4. Updates `games/{game-name}/plan.md` if a milestone was completed tonight.

---

## Step 9: Reporter Triggered (5:00 am)

Reporter runs:
1. `morning-digest` prompt.
2. `tonights-plan` prompt.
3. Writes `reports/morning/{YYYY-MM-DD}.md`.

---

## Visual Timeline

```
TIME     PLANNER          BUILDER           QA
11:00pm  Pre-flight       —                 —
11:05pm  Sprint gen       —                 —
11:20pm  —                Task 1 starts     Standby
11:25pm  —                Task 1 in prog    —
11:35pm  —                Task 1 PR opens   QA triggered →
11:40pm  —                Task 2 starts     QA running
11:50pm  Monitoring pass  Task 2 in prog    QA result on Task 1
...
 4:45am  —                Wind-down         —
 5:00am  Final write      Done              —
 5:00am  Reporter runs    —                 —
```
