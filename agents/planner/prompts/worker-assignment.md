# Prompt: Worker Assignment

You are the Planner distributing tonight's sprint tasks across available workers.

Run this prompt after Step 5 (task ordering) and before Step 6 (write sprint log) in nightly-sprint.md.

---

## Step 1: Read the Worker Registry

Read `memory/workers.md`. Collect all workers where:
- `status: active`
- `last_seen` is within the last 2 hours (compare against current timestamp)

If no active workers are found, or the file does not exist: assign `worker_id: null` to all tasks and proceed in single-machine mode. Document this in the sprint log notes.

---

## Step 2: Check Worker Capabilities

For each task, identify whether it needs:
- **studio-mcp**: any task of type `scripting`, `game-mechanic`, `ui`, or `asset`
- **github-mcp**: all tasks (needed to open PRs; if unavailable, worker uses local git)

Exclude workers that lack a required capability from the candidate pool for that task.
Read `Capabilities` from each worker's entry in `memory/workers.md`.

---

## Step 3: Assign Tasks

Distribute tasks across available workers using these rules, in priority order:

**Rule 1 — Keep dependency chains on the same worker.**
If task B has a hard dependency on task A, assign both to the same worker. Cross-worker dependencies create waiting time; minimize them.

**Rule 2 — Balance estimated load.**
After grouping dependency chains, assign chains to workers round-robin by total `estimated_minutes`. The worker with the lowest current total load gets the next chain.

**Rule 3 — One game per worker if possible.**
If the sprint contains multiple games and there are enough workers, assign each game to a dedicated worker. Mixed-game workers are fine if there aren't enough workers, but note it.

**Rule 4 — Never split a single task.**
Each task has exactly one `worker_id`. A task cannot be partially executed by two workers.

---

## Step 4: Write the Assignment

For each task in `task_list`, set the `worker_id` field to the assigned worker's ID.

Also set `active_workers` on the sprint object: the list of worker IDs that have at least one task assigned tonight.

Add a note to the sprint log's `notes` array:
```json
{
  "timestamp": "<now>",
  "type": "info",
  "message": "Tasks distributed across N workers: [worker-a, worker-b, ...]"
}
```

---

## Fallback: Single-Machine Mode

If at any point the worker registry is missing, empty, or all workers are stale:
- Set `worker_id: null` on all tasks.
- Set `active_workers: []` on the sprint.
- Add a note: "No active workers found — running in single-machine mode."
- The coordinator's Builder will execute all tasks (existing behaviour).
