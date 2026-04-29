# Agent Decisions Log

Log of significant architectural and design decisions made by agents. Future agents read this file to avoid reversing decisions that were made deliberately.

---

## Entry Format

```
## Decision: {short description}
ID: decision-{YYYY-MM-DD-HH-MM}
Timestamp: {ISO 8601}
Game: {game-name | "system-wide"}
Agent: {architect | planner | builder | human}
Decision: {what was decided}
Rationale: {why this decision was made — the constraint, trade-off, or insight that led to it}
Alternatives considered: {what else was considered and why it was not chosen}
Status: {active | revisited by decision-{id}}
```

---

## What Qualifies for This Log

- Choosing one implementation approach over another when multiple valid approaches exist.
- Deciding to scope a feature differently than the spec implied.
- Choosing a specific Roblox service or pattern over alternatives.
- Deciding to defer a task or feature to a later milestone.
- Deciding to use a community library vs building from scratch.
- Any ambiguity in the spec that was resolved by making an assumption.

---

## What Does NOT Belong Here

- Routine task completions (those go in `progress.md`).
- Bug fixes (those go in PR descriptions).
- Sprint planning choices (those go in `sprint-log.md`).

---

## Decisions

*No decisions recorded yet. This file will be populated as Architect and Planner make planning decisions.*
