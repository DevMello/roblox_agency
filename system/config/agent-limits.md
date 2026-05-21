# Agent Limits

Hard operational constraints for every agent. All agents must stay within these limits. Violations trigger escalation to Planner.

---

## Per-Agent Limits

| Agent | Max tokens/call | Max retries | Max wall-clock/call | Context history carried |
|-------|----------------|-------------|---------------------|------------------------|
| Architect | 16,000 | 2 | 30 min | Full spec + task tree only |
| Researcher | 8,000 | 3 | 15 min | Caller's question + source excerpts |
| Planner (sprint gen) | 12,000 | 2 | 15 min | plan.md + overrides + blockers |
| Planner (monitoring) | 4,000 | 1 | 5 min | Current sprint-log.md only |
| Planner (replan) | 8,000 | 2 | 10 min | Sprint log + failure context |
| Builder (per task) | 20,000 | 3 | 90 min | Current task + sprint context |
| QA (per PR) | 10,000 | 2 | 20 min | PR diff + task spec reference |
| Reporter | 8,000 | 2 | 30 min | Sprint logs + PR data |
| Market Researcher | 12,000 | 2 | 2 hr total | Source data only |

---

## Failure Classification

### Soft warning
A recoverable issue that does not require stopping a task. Logged in the sprint log but does not interrupt execution.

**Examples:**
- A lint suggestion (style issue, not a bug).
- A research result that returned partial data.
- A task that took 10–50% longer than estimated.
- A PR that QA flagged with non-blocking comments.

### Hard failure
An issue that stops the current task and requires Planner intervention. The task is marked `failed` in the sprint log.

**Examples:**
- Builder has attempted to implement a task 3 times and all attempts failed.
- A dependency PR has not been merged and the task cannot proceed.
- A required MCP server is unreachable and there is no fallback.
- QA blocked a PR with a `qa-failed` label.
- A task exceeded 2× its estimated time with no completion in sight.

### Hard abort
A condition that stops the entire night cycle.

**Examples:**
- Both Roblox Studio MCP is unreachable and `gh auth status` fails at pre-flight.
- Planner sprint generation failed after 2 retries.
- The nightly API spend cap was hit.

---

## Escalation Rules

- **Only Planner may escalate a failure** to a higher-severity state or to the morning report.
- Builder and QA never declare a hard abort. They mark tasks as failed and wait for Planner's next monitoring pass.
- If Planner itself fails during sprint generation, the night cycle aborts and the morning report flags it.
- Planner never escalates to human in real-time — it logs the issue and Reporter surfaces it in the morning.
- Human escalation triggers (from QA): security-relevant change, data-loss risk, spec conflict QA cannot resolve. These are flagged with a `needs-human` label on the PR and noted in the morning report.

---

## Context Window Management

Each agent carries only the minimum history needed for its task:

- **Architect:** Loads the full spec file and the in-progress task tree. Does not load game history, sprint logs, or other specs.
- **Planner (sprint gen):** Loads `plan.md` for all active games, `memory/human-overrides.md`, `memory/blockers.md`, and today's TBD PRs. Does not load Builder's previous code.
- **Planner (monitoring):** Loads only the current sprint log. Does not reload the full plan.
- **Builder:** Loads the current task definition, relevant source files it will edit, and any Researcher notes for this task. Does not load the full plan or other games' files.
- **QA:** Loads the PR diff and the original task spec. Does not load unrelated game files.
- **Reporter:** Loads last night's sprint log and current PR data. Does not load source code.
- **Market Researcher:** Loads scraped source data. Does not load any game files.

---

## Cost Guardrails

**Nightly API spend cap:** $5.00 USD per night cycle (all agents combined).

**Tracking:** The night cycle wrapper script accumulates token counts from each agent call. It converts to estimated cost using current model pricing at the start of each night.

**When the cap is hit:**
1. Builder is signalled to wind down immediately (same as the 4:45 am wind-down).
2. Planner writes a partial sprint status noting the reason.
3. Reporter includes a cost-cap warning in the morning report.
4. No agent is hard-killed without a wind-down signal first.

**Weekly research cap:** $2.00 USD per weekly run.

**Cost cap overrides:** A human can raise the nightly cap by editing `memory/human-overrides.md` with an entry of type `cost-cap-override` before the night cycle starts. The override is valid for one night only and must be renewed each night it is needed.
