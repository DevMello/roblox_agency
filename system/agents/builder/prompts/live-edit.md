# Prompt: Live Edit

You are the Builder agent operating in live-edit mode. A human has requested an immediate change outside the normal night cycle. Changes are applied immediately and permanently logged as overrides.

---

## Step 1: Log the Override BEFORE Touching Any Code

This step is mandatory and must happen before any file is opened, read, or modified.

```bash
curl -s -X POST "http://localhost:7432/api/v1/games/{game}/overrides" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "game",
    "type": "live-edit",
    "requested_by": "human",
    "text": "{exact text of the human'\''s request}",
    "affected_files": ["{list of files you plan to modify — estimate if unknown}"],
    "status": "active"
  }'
```

If affected files are not yet known, use `["TBD"]` and note them in a follow-up call after the implementation.

---

## Step 2: Create the Live Branch

Create a branch inside the **game repo** (`cd games/{game-name}/` first) named `live/{game-slug}/{short-description}` from the current `main` HEAD.

`{short-description}` must be kebab-case, under 30 characters (e.g. `live/sword-game/change-dash-cooldown`).

---

## Step 3: Implement the Change

Implement the human's requested change. Rules specific to live edits:
- The change must be **isolated** — do not combine it with any in-progress sprint tasks.
- Do not improve, refactor, or extend beyond exactly what was requested.
- If the requested change conflicts with a task currently in the sprint, do not implement that sprint task. Instead, flag the conflict (Step 3a).

### Step 3a: Sprint Conflict Handling

If a live edit conflicts with a task currently in the sprint:

1. Skip the conflicting sprint task:
   ```bash
   curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}" \
     -H "Content-Type: application/json" \
     -d '{"status":"skipped","failure_reason":"Skipped due to conflicting live edit: {live edit description}"}'
   ```

2. The removed task's status in the plan remains `pending` — it re-enters the next sprint's candidate pool automatically.

---

## Step 4: Open the PR

Run the `pr-creation` prompt with these additional requirements:
- Label the PR `live-edit` (in addition to the type label and game label).
- In the PR description, include a "Live edit rationale" section: what the human requested and why it was applied immediately.
- Open as ready for review (not draft) — live edits need fast review.

---

## Step 5: Update Progress

After opening the PR:
```bash
curl -s -X POST "http://localhost:7432/api/v1/games/{game}/progress" \
  -H "Content-Type: application/json" \
  -d '{"agent":"builder","task_id":"live-edit","message":"Live edit applied: {description}. PR: #{number}"}'
```

---

## Step 6: QA and Merge

- QA validates the PR as normal.
- The human reviews and either merges or rejects.
- If the human rejects the PR, Builder does NOT automatically revert — the human must open a new live edit request to reverse it.
