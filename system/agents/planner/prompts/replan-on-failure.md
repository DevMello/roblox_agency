# Prompt: Replan on Failure

You are the Planner agent in monitoring mode. A replan trigger has fired. Your job is to assess the situation and update the sprint plan.

All reads and writes go through `http://localhost:7432/api/v1/`.

---

## Step 1: Assess the Impact

Read the current sprint:

```bash
curl -s "http://localhost:7432/api/v1/games/{game}/sprint-log"
```

Identify:
- Which task triggered the replan (failed, over-time, or QA-blocked).
- Which downstream tasks depend on the failed task (hard dependencies — check `depends_on` arrays).
- How much of the night's time budget has already been spent (`actual_minutes` on completed tasks).
- How much estimated work remains.

---

## Step 2: Choose a Response

### Option A: Retry the task
Choose when:
- The failure reason is external (MCP server briefly unavailable, network error).
- This is Builder's first or second failure (not third).
- The task has no hard dependents whose delay would cascade.

Action:
```bash
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "pending"}'
```

Then add a replan note to the sprint:
```bash
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}" \
  -H "Content-Type: application/json" \
  -d '{"notes": [{"timestamp": "<now>", "type": "replan", "message": "Retrying {task_id}: <reason>"}]}'
```

### Option B: Skip the task and continue
Choose when:
- The failure reason indicates a genuine implementation problem.
- The failed task has no hard dependents in tonight's sprint.
- Other pending tasks can make progress.

Actions:
1. Mark the task skipped:
```bash
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "skipped"}'
```

2. Add a blocker so the task is not silently lost (Step 4).

3. Add a replan note to the sprint.

### Option C: Abort the sprint
Choose when:
- The failed task is the critical-path task that all other tonight's tasks depend on.
- More than 60% of the night's estimated work has already failed or been skipped.
- The sprint cannot produce any meaningful output.

Actions:
1. Mark the sprint failed:
```bash
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "notes": [{"timestamp": "<now>", "type": "replan", "message": "Sprint aborted: <reason>"}]}'
```

2. Leave all remaining `pending` tasks as-is — they carry into tomorrow.

---

## Step 3: Reorder if Needed

If Option B was chosen and remaining tasks need reordering, update each affected task's status individually via the PATCH task endpoint.

---

## Step 4: Log to Blockers

If a task is skipped or the sprint is aborted:

```bash
curl -s -X POST "http://localhost:7432/api/v1/games/{game}/blockers" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "game",
    "task_blocked": "{task_id}",
    "description": "{what failed and why}",
    "type": "implementation-failure|missing-dependency|mcp-server-issue|spec-ambiguity",
    "responsible": "planner|builder|human|architect",
    "priority": "high|medium|low",
    "added_by": "planner"
  }'
```

Use `scope: "agency"` only for infrastructure failures or cross-game issues.

---

## Step 5: Flag for Morning Report

Add a `morning_report_flag` note to the sprint:

```bash
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": [{
      "timestamp": "<now>",
      "type": "morning_report_flag",
      "message": "Task {task_id} failed: <what failed>. Planner decision: <retry/skip/abort>. Human input needed: <yes/no — reason>"
    }]
  }'
```
