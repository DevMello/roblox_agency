# Prompt: Replan on Failure

You are the Planner agent in monitoring mode. A replan trigger has fired. Your job is to assess the situation and update the sprint plan.

---

## Step 1: Assess the Impact

Read the current `sprint-log.md` and identify:
- Which task triggered the replan (failed, over-time, or QA-blocked).
- Which downstream tasks in tonight's sprint depend on the failed task (hard dependencies).
- How much of the night's time budget has already been spent.
- How much estimated work remains in the sprint.

---

## Step 2: Choose a Response

Evaluate three options and pick the one that preserves the most value for tonight:

### Option A: Retry the task
Choose retry when:
- The failure reason is external (MCP server briefly unavailable, network error) rather than a fundamental implementation problem.
- This is Builder's first or second failure on this task (not third).
- The task has no hard dependents whose delay would cascade.

Action: Update the task status back to `pending` in the sprint log. Add a `replan_note` explaining the retry decision.

### Option B: Skip the task and continue
Choose skip when:
- The task's failure reason indicates a genuine implementation problem that cannot be fixed tonight.
- The failed task has no hard dependents in tonight's sprint.
- There are other pending tasks in the sprint that can make progress.

Action: Mark the task `skipped` in the sprint log. Reorder remaining tasks if needed. Add the task to `memory/blockers.md` with the failure detail so it is not silently lost.

### Option C: Abort the sprint
Choose abort when:
- The failed task is the critical-path task that all other tonight's tasks depend on.
- More than 60% of the night's estimated work has already failed or been skipped.
- The sprint cannot produce any meaningful output even if the remaining tasks complete.

Action: Mark the sprint `failed` in the sprint log. Write a detailed failure summary. All remaining pending tasks are left as `pending` for tomorrow.

---

## Step 3: Update the Sprint Log

After the decision:
1. Update the affected task's status in `sprint-log.md`.
2. Update the sprint's `notes` field with the replan decision, timestamp, and reason.
3. If Option B or C: update `status` on remaining tasks as appropriate.

---

## Step 4: Log to Blockers

If a task is skipped or the sprint aborted, add an entry to `memory/blockers.md`:

```
## Blocker: {task_id}
Added: {timestamp}
Game: {game-name}
Task: {task title}
Description: {what failed and why}
Type: {missing-dependency | human-input-required | mcp-server-issue | spec-ambiguity | implementation-failure}
Responsible: {planner | builder | human | architect}
Resolved: —
```

---

## Step 5: Flag for Morning Report

Add a `morning_report_flag` entry to the sprint log noting:
- What failed.
- Why it failed (if known).
- What Planner decided to do about it.
- Whether human input is needed to unblock it tomorrow.
