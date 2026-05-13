# Agency-Level Decisions Log

Agency-level architectural decisions only. Game-specific decisions are in `games/{game-name}/memory/decisions.md`.

This file tracks decisions about the agent system design, workflow conventions, cross-game patterns, and infrastructure. Decisions about a specific game's implementation (which Roblox service to use, how a mechanic works, what to defer to post-launch) belong in the game's own memory, not here.

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

- Choosing one agent system design over another.
- Decisions about workflow conventions (branch naming, commit format, PR rules).
- Decisions about which MCP servers to use or how agents communicate.
- Cross-game infrastructure decisions (memory split, repo isolation, worker model).
- Any ambiguity in the agency's operating model that was resolved by making an assumption.

---

## What Does NOT Belong Here

- Routine task completions (those go in `progress.md`).
- Bug fixes (those go in PR descriptions).
- Sprint planning choices (those go in `sprint-log.md`).
- Game-specific implementation decisions (those go in `games/{game}/memory/decisions.md`).

---

## Decisions

---

## Decision: Agency memory scoped to agency-level state only
ID: decision-2026-05-13-0001
Timestamp: 2026-05-13T00:00:00Z
Game: system-wide
Agent: human
Decision: `memory/` holds only agency-level state (system-wide blockers, cross-game decisions, human overrides that span all games, worker registration). Game-specific state (per-game blockers, per-game decisions, per-game overrides) moves to `games/{game-name}/memory/`. `memory/game-states/` is deprecated — per-game state snapshots live at `games/{game-name}/memory/` going forward.
Rationale: Part of the game-repo isolation refactor. When games move to their own repositories, their memory must travel with them. Keeping game state in the agency repo's `memory/` would make repo extraction impossible without surgery.
Alternatives considered: Keep all memory in the agency repo with per-game subdirectories — rejected because it still couples game state to the agency repo, defeating the purpose of game-repo isolation.
Status: active
