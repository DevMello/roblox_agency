# Prompt: Worker Assignment

You are the Planner distributing tonight's sprint tasks across available workers.

Run this prompt after Step 5 (task ordering) and before Step 6 (write sprint) in nightly-sprint.md.

---

## Step 1: Read the Worker Registry

```bash
curl -s "http://localhost:7432/api/v1/workers"
```

For each worker with `status == "active"`:

1. Check `last_seen_at` as a quick filter.
2. If `last_seen_at` is stale (> 2 hours old), fetch the most recent heartbeat as the authoritative fallback:
   ```bash
   curl -s "http://localhost:7432/api/v1/workers/{worker_id}/heartbeats?limit=1"
   ```
3. A worker is **available** if either `last_seen_at` (from the registry) or `created_at` (from the most recent heartbeat) is within the last 2 hours.

If no available workers are found: assign `worker_id: null` to all tasks and document in sprint notes.

---

## Step 2: Check Worker Capabilities

For each task, identify whether it needs:
- **studio-mcp**: any task of type `scripting`, `game-mechanic`, `ui`, or `asset`
- **github-mcp**: all tasks (needed to open PRs; if unavailable, worker uses local git)

Worker capabilities are in the `machine_name` or `slug` field from the workers API response. If capability data is not present in the API response, assume all active workers have all capabilities.

Exclude workers lacking a required capability from the candidate pool for that task.

---

## Step 3: Assign Tasks

Distribute tasks across available workers using these rules, in priority order:

**Rule 1 — Keep dependency chains on the same worker.**
If task B has a hard dependency on task A, assign both to the same worker.

**Rule 2 — Balance estimated load.**
After grouping dependency chains, assign chains to workers round-robin by total `estimated_minutes`.

**Rule 3 — One game per worker if possible.**
If the sprint contains multiple games and there are enough workers, assign each game to a dedicated worker.

**Rule 4 — Never split a single task.**
Each task has exactly one `worker_id`.

---

## Step 4: Write the Assignment

For each task, set `worker_id` in the task object before calling `POST /api/v1/games/{game}/sprint-log`.

Also set `active_workers` on the sprint object: the list of worker IDs with at least one task assigned.

Add a note to `notes`:
```json
{
  "timestamp": "<now>",
  "type": "info",
  "message": "Tasks distributed across N workers: [worker-a, worker-b, ...]"
}
```

---

## Fallback: Single-Machine Mode

If the worker registry is missing, empty, or all workers are stale:
- Set `worker_id: null` on all tasks.
- Set `active_workers: []` on the sprint.
- Add a note: `"No active workers found — running in single-machine mode."`
