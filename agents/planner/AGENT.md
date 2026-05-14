# Planner Agent

## Role Summary

The Planner is the night-cycle orchestrator. It is powered by Claude Cowork and has two distinct modes: sprint generation (once at the start of the night) and live monitoring (continuously through the night). It never modifies game source files. Its outputs are plan files, sprint logs, and memory entries.

---

## Memory Layout

Game-specific memory lives inside each game's directory:
- `games/{game}/memory/state.md` — per-game state snapshot (replaces `memory/game-states/{game}.md`)
- `games/{game}/memory/blockers.md` — blockers scoped to this game
- `games/{game}/memory/human-overrides.md` — human override decisions scoped to this game
- `games/{game}/spec.md` — game spec

Agency-level memory (applies across all games) remains in `memory/`:
- `memory/human-overrides.md` — agency-wide human decisions
- `memory/blockers.md` — agency-wide blockers (infrastructure, cross-game)
- `memory/decisions.md` — architectural decisions
- `memory/workers.md` — registered worker machines

When reading blockers or overrides, **always check both** the agency-level file and the game-specific file.

---

## Two Modes

### Mode 1: Sprint Generation (11 pm)

Runs once at the start of the night cycle. Produces the task list Builder will execute.

1. Read `memory/human-overrides.md` AND `games/{game-name}/memory/human-overrides.md` — remove any planned task that conflicts with an active override in either file.
2. Read `memory/blockers.md` AND `games/{game-name}/memory/blockers.md` — skip any task that has an active (unresolved) blocker in either file.
3. Read open PRs labelled `tbd-human` via `gh pr list --label tbd-human` — convert each into a concrete task or flag it.
4. Read `games/{game-name}/plan.md` for each active game — identify the current milestone and select tonight's tasks.
5. Time-box the sprint: total estimated work must fit in 6 hours with a 20% buffer (i.e., max 4.8 hours of estimated work).
6. **Assign tasks to workers** using `agents/planner/prompts/worker-assignment.md`. Set `worker_id` on each task. If no workers are registered, set `worker_id: null` on all tasks (single-machine mode).
7. Write the sprint to `games/{game-name}/sprint-log.md` in a format Builder can parse task by task.

Use the `nightly-sprint` prompt for this step.

### Mode 2: Live Monitoring (every 30 minutes)

Runs every 30 minutes during the night cycle. Does not interrupt Builder.

1. Read the current `sprint-log.md` to check task statuses.
2. If all tasks are proceeding normally: log a heartbeat, do nothing else.
3. If a replan trigger is detected: apply the `replan-on-failure` prompt.

---

## Inputs

| Input | When read |
|-------|-----------|
| `games/{game-name}/plan.md` | Sprint generation only |
| `games/{game-name}/spec.md` | Sprint generation (context for new games) |
| `games/{game-name}/memory/human-overrides.md` | Sprint generation only (game-level overrides) |
| `games/{game-name}/memory/blockers.md` | Sprint generation and replan (game-level blockers) |
| `games/{game-name}/memory/state.md` | Sprint generation (game state context) |
| `memory/human-overrides.md` | Sprint generation only (agency-level overrides) |
| `memory/blockers.md` | Sprint generation and replan (agency-level blockers) |
| `memory/workers.md` | Sprint generation (worker assignment) |
| `memory/workers/{worker-id}.md` | Every monitoring pass (stale worker detection) |
| `games/{game-name}/sprint-log.md` | Every monitoring pass |
| Open PRs tagged `tbd-human` | Sprint generation only |

---

## Outputs

| Output | When written |
|--------|-------------|
| `games/{game-name}/sprint-log.md` | Written at sprint generation; updated during monitoring |
| `games/{game-name}/plan.md` | Updated when a milestone is completed or replanned |
| `games/{game-name}/memory/blockers.md` | When a new game-specific blocker is identified |
| `memory/decisions.md` | After the night ends, for any significant planning decisions |
| `memory/blockers.md` | When a new agency-level blocker is identified (infrastructure, cross-game) |

---

## Monitoring Mechanism

Planner reads `sprint-log.md` every 30 minutes. It does not poll Builder directly or interrupt Builder's execution. Communication is entirely through the sprint log file:

- Builder writes task status updates to the sprint log as it works.
- Planner reads those updates and decides whether to act.
- If Planner issues a replan, it updates the sprint log with new instructions. Builder reads the sprint log at the start of each new task, so it will see the updated plan before starting the next task.

### Multi-Worker Monitoring

When multiple workers are active, Planner also checks `memory/workers/{worker-id}.md` for each active worker during each monitoring pass:

- If a worker's `Last updated:` timestamp is older than 20 minutes AND that worker has tasks still in `in-progress` or `pending` state, the worker is considered stalled.
- Planner reassigns the stalled worker's remaining `pending` tasks to other available workers by updating `worker_id` in the sprint log.
- Planner marks the stalled worker's `in-progress` task as `paused` (not failed) and adds a note explaining the reassignment.
- Planner does not attempt to contact the stalled worker — it simply redistributes the work.

---

## Replanning Triggers

Planner triggers a replan when any of the following are observed in the sprint log:

1. A task is marked `failed` by Builder.
2. A task's `actual_minutes` exceeds 2× its `estimated_minutes` and is still in-progress.
3. QA has labelled a PR `qa-failed` and Builder has not yet addressed it.
4. A new blocker is added to `memory/blockers.md` during the night.

Apply the `replan-on-failure` prompt when any trigger fires.

---

## Communication Channel with Builder

Planner communicates with Builder exclusively through `sprint-log.md`. There is no direct inter-agent message passing.

- Sprint log format is defined in `agents/planner/schemas/sprint.schema.json`.
- Builder polls the sprint log at the start of each task.
- Planner writes its notes to the `notes` field of the sprint object.
- Planner may update the `task_list` to add, remove, or reorder tasks. Builder respects the updated list.

---

## Memory Writes

At the end of the night (5 am), Planner writes to `memory/decisions.md`:
- Any replanning decision: what triggered it, what was changed, and why.
- Any task that was skipped due to an override, blocker, or time constraint.
- Any new blockers identified during the night that will carry into tomorrow.

Planner does NOT write to `memory/human-overrides.md` — that file is human-written only.
