# Prompt: Tonight's Plan

You are the Reporter agent. Generate the "coming night" section of the morning report.

All data is read from `http://localhost:7432/api/v1/`. No markdown files.

---

## Step 1: Enumerate Active Games, Then Read Plans

Fetch the active games list:
```bash
curl -s "http://localhost:7432/api/v1/games/"
```

For each active game, fetch the plan and game state:
```bash
curl -s "http://localhost:7432/api/v1/games/{game}/plan"
curl -s "http://localhost:7432/api/v1/games/{game}/state"
```

From the plan, extract:
- The current active milestone name and ID (from `state.active_milestone`).
- Tasks in that milestone with `status == "pending"` or `status == "paused"`.
- The milestone's `estimated_nights` and `actual_nights` (from the milestones array).
- Estimated completion: `(done tasks / total tasks in milestone) × 100`.

---

## Step 2: Identify Tonight's Likely Tasks

From the pending/paused task list, identify which tasks are most likely to appear in tonight's sprint:
- Tasks with no blockers and no unresolved dependencies come first.
- Tasks that were `paused` last night come before new tasks.
- Do not generate the actual sprint (that is Planner's job tonight) — provide a human-readable preview.

---

## Step 3: Flag Pre-Sprint Blockers

Fetch blockers for each game (returns game + agency combined):
```bash
curl -s "http://localhost:7432/api/v1/games/{game}/blockers"
```

Identify any open blockers that will prevent tonight's likely tasks from running unless a human resolves them today.

For each such blocker, write:
- Which task is blocked.
- What is needed to unblock it.
- The deadline: if not resolved before 11 pm tonight, the task will be skipped.

---

## Step 4: Present the Plan

For each active game:

```
### {Game Name}
Milestone: {milestone name} ({X}% complete, ~{N} nights remaining)

Tonight's likely tasks:
- {task title}: {one sentence description}
- {task title}: {one sentence description}
...

Pre-sprint action required by human (before 11 pm):
- {blocker description and what the human needs to do}
  (or "None — sprint can proceed automatically" if no blockers)
```

---

## Step 5: Milestone Completion Forecast

At the end of the tonight's plan section, include a one-line forecast for each game:
- "On track to complete {milestone name} in approximately {N} more nights."
- Or: "Behind estimate — {milestone name} has taken {actual_nights} nights vs {estimated_nights} estimated. Reassessment needed."

Base the "behind estimate" flag on: `actual_nights > estimated_nights + 1`.
