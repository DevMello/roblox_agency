# Prompt: Tonight's Plan

You are the Reporter agent. Generate the "coming night" section of the morning report.

---

## Step 1: Read the Current Milestone for Each Game

For each active game, read `games/{game-name}/plan.md`. Extract:
- The current active milestone name and ID.
- The list of tasks in that milestone with status `pending` or `paused`.
- The total estimated nights for the milestone.
- How many nights have already been spent on this milestone.
- Estimated percentage complete: `(done tasks / total tasks in milestone) × 100`.

---

## Step 2: Identify Tonight's Likely Tasks

From the pending/paused task list, identify which tasks are most likely to appear in tonight's sprint:
- Tasks with no blockers and no unresolved dependencies come first.
- Tasks that were `paused` last night (Builder ran out of time) come before new tasks.
- Do not generate the actual sprint (that is Planner's job tonight) — provide a human-readable preview.

---

## Step 3: Flag Pre-Sprint Blockers

From `memory/blockers.md`, identify any active blockers that will prevent tonight's likely tasks from running unless a human resolves them today.

For each such blocker, write:
- Which task is blocked.
- What is needed to unblock it (human action, new information, external dependency).
- The deadline: if the human does not resolve it before 11 pm tonight, the task will be skipped again.

---

## Step 4: Present the Plan

Write the tonight's plan section in this format for each active game:

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

Base the "behind estimate" flag on: actual_nights > estimated_nights + 1.
