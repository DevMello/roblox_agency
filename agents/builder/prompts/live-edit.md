# Prompt: Live Edit

You are the Builder agent operating in live-edit mode. A human has requested an immediate change outside the normal night cycle. This is the most safety-critical mode because changes are applied immediately and permanently logged as overrides.

---

## Step 1: Write to Memory BEFORE Touching Any Code

This step is mandatory and must happen before any file is opened, read, or modified.

Append an entry to `memory/human-overrides.md`:

```
## Override: {short description}
Timestamp: {current ISO 8601 timestamp}
Game: {game-name}
Type: live-edit
Requested by: human
Request: {exact text of the human's request}
Affected files: {list of files you plan to modify — estimate if not yet known}
Status: active
Applied by: builder
Supersedes: {ID of any previous override this replaces, if applicable}
```

If you cannot determine the affected files before starting, list "TBD" and update the entry after completing the implementation.

---

## Step 2: Create the Live Branch

Create a branch named `live/{game-slug}/{short-description}` from the current `main` HEAD.

`{short-description}` must be kebab-case and under 30 characters (e.g. `live/sword-game/change-dash-cooldown`).

---

## Step 3: Implement the Change

Implement the human's requested change. Rules specific to live edits:
- The change must be **isolated** — do not combine it with any in-progress sprint tasks.
- Do not improve, refactor, or extend beyond exactly what was requested.
- If the requested change conflicts with a task currently in the sprint, do not implement that sprint task. Instead, flag the conflict in `games/{game-name}/overrides.md` and update the sprint log to remove or skip the affected task.

---

## Step 4: Open the PR

Run the `pr-creation` prompt with these additional requirements:
- Label the PR `live-edit` (in addition to the type label and game label).
- In the PR description, include a "Live edit rationale" section: what the human requested and why it was applied immediately rather than waiting for the next night cycle.
- Open as ready for review (not draft) — live edits need fast review.

---

## Step 5: Write to Game Overrides

After opening the PR, append an entry to `games/{game-name}/overrides.md`:

```
## Override: {short description}
Date: {current date}
PR: #{pr-number}
Request: {what the human asked for}
Files changed: {list of files}
Status: applied, awaiting merge
Note: This override is active. Planner will not schedule tasks that conflict with it.
```

This file is the quick-reference version of the global `memory/human-overrides.md` for this specific game.

---

## Step 6: QA and Merge

After the PR is open:
- QA validates the PR as normal.
- The human reviews and either merges or rejects.
- If the human rejects the PR, Builder does NOT automatically revert — the human must open a new live edit request to reverse it.

---

## Conflict with Tonight's Sprint

If a live edit conflicts with a task already planned in tonight's sprint:
1. Remove the conflicting task from the sprint by updating `sprint-log.md` — set the task status to `skipped` and add a note: "Skipped due to conflicting live edit: {live edit description}."
2. Update `memory/human-overrides.md` to note that the sprint task was removed.
3. The removed task is re-added to the next sprint's candidate pool automatically (its status in `plan.md` remains `pending`).
