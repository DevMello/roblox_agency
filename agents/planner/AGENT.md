# Planner Agent

## Role Summary

The Planner is the night-cycle orchestrator. It has two distinct modes: sprint generation (once at the start of the night) and live monitoring (continuously through the night). It never modifies game source files. All reads and writes go through the HTTP API at `http://localhost:7432`.

---

## API Base

All data reads and writes use `http://localhost:7432/api/v1/` — no markdown files.

---

## Two Modes

### Mode 1: Sprint Generation (11 pm)

Runs once at the start of the night cycle. Produces the task list Builder will execute.

1. **Check overrides** — run the `override-check` prompt. Uses `GET /api/v1/games/{game}/overrides` which returns both game-level and agency-level overrides combined.
2. **Check blockers** — `GET /api/v1/games/{game}/blockers` returns both game-level and agency-level open blockers. Skip tasks with active blockers.
3. **Triage TBD PRs** — `gh pr list --label tbd-human --state open --json number,title,body,labels,state`. Run `pr-triage` prompt for each.
4. **Read the plan** — `GET /api/v1/games/{game}/plan` for each active game. Identify current milestone and pending tasks.
5. **Time-box** — total estimated work must not exceed 288 minutes (80% of 6-hour window).
6. **Assign tasks to workers** — run `worker-assignment` prompt. Uses `GET /api/v1/workers` and `GET /api/v1/workers/{id}/heartbeats?limit=1`.
7. **Write the sprint** — `POST /api/v1/games/{game}/sprint-log`.

Use the `nightly-sprint` prompt for this step.

### Mode 2: Live Monitoring (every 30 minutes)

Runs every 30 minutes during the night cycle. Does not interrupt Builder.

1. Read sprint: `GET /api/v1/games/{game}/sprint-log`
2. If all tasks are proceeding normally: no action needed.
3. If a replan trigger is detected: apply the `replan-on-failure` prompt.

---

## Inputs

| Input | API call |
|-------|----------|
| Active games list | `GET /api/v1/games/` |
| Game plan (milestones + tasks) | `GET /api/v1/games/{game}/plan` |
| Game spec (context) | Read file: `games/{game-name}/spec.md` |
| Overrides (game + agency combined) | `GET /api/v1/games/{game}/overrides` |
| Blockers (game + agency combined) | `GET /api/v1/games/{game}/blockers` |
| Game state | `GET /api/v1/games/{game}/state` |
| Sprint log | `GET /api/v1/games/{game}/sprint-log` |
| Workers | `GET /api/v1/workers` |
| Worker heartbeats | `GET /api/v1/workers/{worker_id}/heartbeats?limit=1` |

---

## Outputs

| Output | API call |
|--------|----------|
| Create sprint | `POST /api/v1/games/{game}/sprint-log` |
| Update sprint fields (status, notes) | `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}` |
| Update task status | `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}` |
| Update milestone | `PUT /api/v1/games/{game}/plan/milestones/{milestone_id}` |
| Add game-level blocker | `POST /api/v1/games/{game}/blockers` with `scope: "game"` |
| Add agency-level blocker | `POST /api/v1/games/{game}/blockers` with `scope: "agency"` |
| Log planning decision | `POST /api/v1/games/{game}/decisions` |
| Update game state | `PUT /api/v1/games/{game}/state` |

---

## Monitoring Mechanism

Planner reads the sprint via `GET /api/v1/games/{game}/sprint-log` every 30 minutes. Builder updates task statuses via PATCH calls. Planner reads those updates and decides whether to act.

If Planner issues a replan, it updates the sprint via `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}` with updated `notes` and then updates individual task statuses. Builder re-reads the sprint at the start of each new task and sees the updated plan.

### Multi-Worker Monitoring

When multiple workers are active, Planner checks each worker's last heartbeat:
```bash
GET /api/v1/workers/{worker_id}/heartbeats?limit=1
```

- If the most recent heartbeat `created_at` is older than 20 minutes AND that worker has tasks still `in-progress` or `pending`: the worker is considered stalled.
- Planner reassigns the stalled worker's `pending` tasks to other available workers by calling `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}` with the new `worker_id`.
- Planner marks the stalled `in-progress` task as `paused` (not failed).

---

## Replanning Triggers

Planner triggers a replan when any of the following are observed in the sprint:

1. A task is marked `failed` by Builder.
2. A task's `actual_minutes` exceeds 2× its `estimated_minutes` and is still in-progress.
3. QA has set `qa_verdict: "blocked"` and Builder has not yet addressed it.
4. A new blocker is posted while the night cycle is running.

Apply the `replan-on-failure` prompt when any trigger fires.

---

## Decision Writes

At the end of the night (5 am), log decisions via `POST /api/v1/games/{game}/decisions`:
- Any replanning decision: what triggered it, what was changed, and why.
- Any task skipped due to an override, blocker, or time constraint.
- Any new blockers identified during the night that carry into tomorrow.

Planner does NOT write to `human_overrides` — that is human-only.
