# Schedule

Canonical source of truth for all time windows and activation order. All GitHub Actions workflows and agent logic derive their timing from this file.

---

## Time Windows

**Timezone:** America/New_York (ET)

| Window | Start | End | Purpose |
|--------|-------|-----|---------|
| Night Cycle | 11:00 pm | 5:00 am | Autonomous build and QA |
| Morning Report | 5:00 am | 5:30 am | Reporter generates daily digest |
| Day Cycle | 5:30 am | 11:00 pm | Human review, feedback, live edits |
| Weekly Research | Sunday 2:00 am | Sunday ~4:00 am | Market Researcher runs full analysis |

---

## Night Cycle Activation Order

Agents activate in strict sequence. No agent in a later step starts until the previous step is complete.

```
11:00 pm  Planner (sprint generation)
            - Reads memory/human-overrides.md
            - Reads memory/blockers.md
            - Reads open PRs labelled tbd-human
            - Writes games/{game-name}/sprint-log.md

11:15 pm  Builder (task execution) + QA (per-PR validation) — parallel
            - Builder reads sprint-log.md, begins tasks in order
            - QA triggers automatically when Builder opens each PR

Every 30m  Planner (live monitoring)
            - Checks task statuses in sprint-log.md
            - Issues replan if trigger conditions are met

 4:45 am  Builder wind-down
            - Marks any in-progress task as paused
            - Commits current work to branch, opens draft PR

 5:00 am  Planner final write
            - Writes final sprint status to sprint-log.md
            - Logs decisions to memory/decisions.md

 5:00 am  Reporter triggered
            - Generates reports/morning/{YYYY-MM-DD}.md
```

---

## Agent Time Budgets

| Agent | Activation type | Max wall-clock time per activation |
|-------|-----------------|-----------------------------------|
| Planner (sprint gen) | Once at night start | 15 minutes |
| Planner (monitoring) | Every 30 minutes | 5 minutes |
| Planner (replan) | On-demand, triggered by failure | 10 minutes |
| Builder (per task) | Sequential | min 10 min, max 90 min |
| QA (per PR) | Triggered per PR | max 20 minutes |
| Reporter | Once at 5 am | 30 minutes |
| Market Researcher | Once weekly | 2 hours |
| Architect | Once per spec | 30 minutes |
| Researcher | On-demand (called by other agents) | 15 minutes |

**Builder task target range:** Each task Builder picks up should be scoped to complete in 10–90 minutes. Planner must not schedule tasks estimated above 90 minutes without splitting them. Tasks below 10 minutes should be batched with adjacent tasks.

---

## Overflow Policy

- **Builder exceeds 2× its task estimate:** Planner detects this on the next 30-minute monitoring pass and triggers a replan. See `agents/planner/prompts/replan-on-failure.md`.
- **QA exceeds 20 minutes:** The PR is left in pending state. Planner notes it in the sprint log and Builder moves to the next task. QA retries on next cycle.
- **Planner sprint generation exceeds 15 minutes:** Builder does not start. The night cycle logs a warning and exits. Reporter flags this in the morning digest.
- **Night cycle reaches 4:45 am with tasks still running:** Builder is signalled to wind down. In-progress work is committed as a draft PR. No task is abandoned without a branch and commit.
- **Weekly research exceeds 2 hours:** Market Researcher writes whatever outputs it has completed and stops. The next week's run picks up where gaps remain.

Agents are never hard-killed mid-operation. Wind-down signals are sent first; a hard kill only occurs if the agent does not respond within 5 minutes of a wind-down signal.

---

## Weekly Schedule

| Day | Time (ET) | Activity |
|-----|-----------|----------|
| Sunday | 2:00 am | Weekly research run (Market Researcher) |
| Sunday | ~4:00 am | Weekly research output written to reports/weekly/ |
| Monday–Saturday | 11:00 pm | Night cycle start |
| Daily | 5:00 am | Morning report generated |
