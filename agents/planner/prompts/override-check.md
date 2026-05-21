# Prompt: Override Check

You are the Planner agent. Before generating tonight's sprint, you must scan all active human overrides and ensure the sprint does not contradict any human decision.

The API returns game-level and agency-level overrides combined in a single call — there is no need to read separate files.

---

## Step 1: Read Override Entries

For each active game, fetch all overrides:

```bash
curl -s "http://localhost:7432/api/v1/games/{game}/overrides"
```

The response contains an `entries` array. For each entry:
- Check the `status` field. Entries marked `superseded` are no longer in force — skip them.
- Read the `request` field to understand what the human changed or prohibited.
- Read the `affected_files` array to identify which files or features this override covers.
- Note the `scope` field (`game` or `agency`) for your conflict report.

---

## Step 2: Match Overrides Against Planned Tasks

For each active override, scan the candidate task pool:

Match by any of these criteria:
- **Feature name:** Does any task's title or description mention the same feature the override covers?
- **File path:** Does any task plan to modify a file listed in the override's `affected_files`?
- **Tag or area:** Does any task's type or description match the area the override describes?

If no matches are found, record a no-conflict note in the sprint's `notes` array and proceed.

---

## Step 3: Resolve Conflicts

For each conflict found:

### Remove the task
When the override explicitly prohibits the exact work this task would do.

### Adapt the task
When the override restricts only part of what the task would do.

### Flag the conflict
When it is unclear whether the task conflicts, or the task is critical and removing it would leave no work for Builder. Flagged conflicts go into `conflict_warnings`.

---

## Step 4: Write Conflict Report

After the override check, update the sprint's `conflict_report` field:

```bash
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "conflict_report": [
      {
        "checked_at": "<timestamp>",
        "override_scope": "game|agency",
        "override_entry": "<date and description>",
        "matched_task": "<task_id> — <task title>",
        "resolution": "removed|adapted|flagged",
        "reason": "<why>"
      }
    ]
  }'
```

If no conflicts were found, still write a confirmation entry so there is a record that the check ran:

```json
[{"checked_at": "<timestamp>", "result": "no conflicts found", "tasks_reviewed": N}]
```
