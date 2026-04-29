# Blockers

Current list of all known blockers across all active games. Planner reads this before every sprint and skips any task with an active blocker.

---

## Rules

1. **Planner reads this before every sprint** and removes any task with an active (unresolved) blocker from the night's candidate pool.
2. **When a blocker is resolved, mark it resolved with a timestamp** — do not delete it. The history of what was blocked and why is valuable.
3. **Reporter surfaces all active unresolved blockers** in every morning report.
4. **Any agent can add a blocker.** Only the responsible party or a human can mark it resolved.

---

## Entry Format

```
## Blocker: {short description}
ID: blocker-{YYYY-MM-DD-HH-MM}
Added: {ISO 8601 timestamp}
Game: {game-name}
Task blocked: {task-id} — {task title}
Description: {what the blocker is and why it prevents the task}
Type: {missing-dependency | human-input-required | mcp-server-issue | spec-ambiguity | implementation-failure | external-dependency}
Responsible: {planner | builder | human | architect | external}
Priority: {high | medium | low}
Added by: {agent or human who identified this blocker}
Resolved: {ISO 8601 timestamp — or blank if still active}
Resolution: {how it was resolved — or blank if still active}
```

---

## Active Blockers

*No active blockers. This is the desired steady state.*

---

## Resolved Blockers

*None yet.*
