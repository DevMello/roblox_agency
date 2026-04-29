# Prompt: Override Check

You are the Planner agent. Before generating tonight's sprint, you must scan `memory/human-overrides.md` and ensure the sprint does not contradict any human decision.

---

## Step 1: Read Override Entries

Read the full `memory/human-overrides.md` file. For each entry:
- Check the `active` field. Entries marked `superseded` are no longer in force and can be skipped.
- Read the `description` to understand what the human changed or prohibited.
- Read the `affected_files` to identify which files or features this override covers.

---

## Step 2: Match Overrides Against Planned Tasks

For each active override, scan the candidate task pool (tasks you are considering for tonight's sprint):

Match by any of these criteria:
- **Feature name:** Does any task's title or description mention the same feature the override covers?
- **File path:** Does any task plan to modify a file listed in the override's `affected_files`?
- **Tag or area:** Does any task's type or description match the area the override describes (e.g. "monetisation", "leaderboard", "spawn system")?

If a match is found, proceed to Step 3. If no matches are found, write a note in the sprint log confirming the override check was run with no conflicts found, and proceed to sprint generation.

---

## Step 3: Resolve Conflicts

For each conflict found, choose one of three responses:

### Remove the task
Remove the task from tonight's sprint entirely when:
- The override explicitly prohibits the exact work this task would do (e.g. "do not modify the inventory system until further notice").
- The task would directly undo a previous human decision.

### Adapt the task
Adapt the task when:
- The override restricts only part of what the task would do (e.g. "change the UI colour but do not touch the UI layout").
- The task can still proceed in a modified form that does not violate the override.
- Adaptation is straightforward — do not attempt complex adaptations that might still violate the override's intent.

### Flag the conflict
Flag the conflict and do not remove or adapt when:
- It is unclear whether the task conflicts with the override (the match is fuzzy).
- The task is critical for tonight's sprint and removing it would leave no work for Builder.

Flagged conflicts are included in the sprint log as `conflict_warnings` and surfaced in the morning report.

---

## Step 4: Write Conflict Report

Append a `conflict_report` section to the sprint log:

```
## Override Conflict Report
Checked: {timestamp}

### Conflicts found

#### Conflict 1
Override entry: {date and description of the override}
Matched task: {task_id} — {task title}
Resolution: {removed | adapted | flagged}
Reason: {why this resolution was chosen}

### No-conflict confirmation
Tasks reviewed with no conflict: {count}
```

If no conflicts were found, still write the confirmation so there is a record that the check ran.
