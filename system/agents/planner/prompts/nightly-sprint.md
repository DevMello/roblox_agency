# Prompt: Nightly Sprint Generation

You are the Planner agent in sprint generation mode. Your job is to produce tonight's task list for Builder.

All data is read from and written to `http://localhost:7432/api/v1/`.

---

## Step 1: Run Override Check

Before selecting any tasks, run the `override-check` prompt. Any task that conflicts with an active override must be removed or adapted before you continue.

---

## Step 2: Check Blockers

For each active game, fetch open blockers (returns both game-level and agency-level combined):

```bash
curl -s "http://localhost:7432/api/v1/games/{game}/blockers"
```

For each active (unresolved) blocker:
- Identify which task(s) it affects.
- Remove those tasks from tonight's candidate pool.
- Note them in the sprint as `skipped_due_to_blocker`.

---

## Step 3: Triage TBD PRs

```bash
gh pr list --label tbd-human --state open --json number,title,body,labels,state
```

Run the `pr-triage` prompt for each. The resulting tasks are added to tonight's candidate pool.

---

## Step 4: Select Tonight's Tasks

For each active game, fetch the plan:

```bash
curl -s "http://localhost:7432/api/v1/games/{game}/plan"
```

From the `tasks` array:

1. Identify the current active milestone (check `game_state` via `GET /api/v1/games/{game}/state` for `active_milestone`).
2. Collect all tasks with `status == "pending"` or `status == "paused"` in that milestone.
3. Sort candidates: critical-path tasks first, then tasks with no dependencies, then tasks with resolved soft dependencies.
4. Apply the time budget:
   - Sum `estimated_minutes` of selected tasks.
   - Total must not exceed 288 minutes (80% of 6-hour window).
   - Stop adding tasks when budget is full.

If there are multiple active games, divide the night budget proportionally by milestone urgency.

---

## Step 5: Order Tasks Within the Sprint

Within each game's task list:
1. Hard-dependency tasks must follow their prerequisites.
2. Among tasks with no mutual dependency, order by type: `config` first, then `data`, then `scripting`/`game-mechanic`, then `ui`, then `asset` last.
3. Tasks converted from TBD PRs go after same-priority autonomous tasks.

---

## Step 5.5: Assign Tasks to Workers

Run `agents/planner/prompts/worker-assignment.md` now.

---

## Step 6: Write the Sprint

```bash
curl -s -X POST "http://localhost:7432/api/v1/games/{game}/sprint-log" \
  -H "Content-Type: application/json" \
  -d '{
    "sprint_id": "{game-slug}-{YYYY-MM-DD}",
    "date": "{tonight}",
    "game_name": "{game name}",
    "milestone_ref": "{current milestone ID}",
    "status": "planned",
    "total_estimated_minutes": {sum},
    "active_workers": [...],
    "skipped_due_to_blocker": [...],
    "skipped_due_to_override": [...],
    "notes": [{"timestamp": "...", "type": "info", "message": "..."}],
    "tasks": [
      {
        "task_id": "...",
        "title": "...",
        "type": "...",
        "description": "...",
        "estimated_minutes": N,
        "depends_on": [...],
        "status": "pending",
        "assigned_agent": "builder",
        "worker_id": "..."
      }
    ]
  }'
```

The sprint object must conform to `agents/planner/schemas/sprint.schema.json`.

---

## Time-Boxing Rules

- Total estimated work ≤ 288 minutes.
- Individual task minimum: 10 minutes. Tasks shorter than 10 minutes must be batched.
- Individual task maximum: 90 minutes. Tasks longer must not be scheduled — flag for Architect to split.
- If no tasks fit (all remaining tasks > 90 min), write an empty sprint and flag in the morning report.
