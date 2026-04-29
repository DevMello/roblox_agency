# Memory System — Operating Manual

The memory system persists human intent and agent decisions across nights so context is never lost between sessions. These files are the most important files in the repository because they are the source of truth for decisions that are not visible in the code itself.

---

## Files

### `memory/human-overrides.md`
**What it tracks:** Every change or decision a human has made or requested. The permanent record of human intent.

**Who can write:** Humans directly, or Builder on behalf of a human (during live edits). Planner and other agents are read-only.

**Write frequency:** Any time a human makes a change request or decision. Never deleted.

**Key property:** Append-only. Entries are superseded but never deleted. This means the full history of human decisions is always recoverable.

---

### `memory/decisions.md`
**What it tracks:** Significant architectural and design decisions made by agents, with rationale.

**Who can write:** Architect (after planning runs) and Planner (after each night cycle). Builder and QA are read-only. Humans may add entries manually.

**Write frequency:** After each Architect run and each night cycle if decisions were made.

**Key property:** Decisions are never overwritten — they are either still active or marked "revisited" with a new decision entry. This prevents agents from repeatedly making the same decision in different ways.

---

### `memory/blockers.md`
**What it tracks:** All known blockers across all active games — reasons a task cannot be worked on.

**Who can write:** Planner (adds and resolves blockers), Builder (adds blockers when it hits failures), QA (adds blockers on escalations). Read-only for Reporter.

**Write frequency:** Whenever a new blocker is identified; whenever a blocker is resolved.

**Key property:** Resolved blockers are marked with a timestamp, not deleted. This creates a history of what problems were encountered and how they were resolved.

---

### `memory/game-states/{game-name}.md`
**What it tracks:** A running snapshot of a single game's state. One file per game.

**Who can write:** Planner updates this after each night. Architect updates it after planning runs. Read-only for Builder, QA, Reporter.

**Write frequency:** After every night cycle.

---

## Write Permissions Summary

| File | Architect | Planner | Builder | QA | Reporter | Human |
|------|-----------|---------|---------|-----|---------|-------|
| `human-overrides.md` | — | read | write (on behalf of human) | — | read | **write** |
| `decisions.md` | **write** | **write** | read | — | read | write |
| `blockers.md` | — | **write** | **write** | write (escalations) | read | write |
| `game-states/{name}.md` | **write** | **write** | read | — | read | — |

---

## How Planner Uses Memory

At the start of every night:
1. Reads all of `human-overrides.md` — identifies active overrides to exclude from the sprint.
2. Reads `blockers.md` — identifies tasks that cannot be scheduled.
3. Reads `game-states/{game-name}.md` — cross-checks current state.
4. Reads `decisions.md` — ensures tonight's sprint does not contradict recent architectural decisions.

At the end of every night:
1. Writes new blockers and decisions to their respective files.
2. Updates `game-states/{game-name}.md` with the night's progress.

---

## How Reporter Uses Memory

Each morning:
1. Reads `blockers.md` — surfaces active blockers in the morning report.
2. Reads `decisions.md` — notes significant new decisions in the report.
3. Does not write to any memory file.

---

## Archiving Policy

When any memory file exceeds 500 lines:
1. Planner creates an archive file: `memory/archive/{filename}-{YYYY-MM}.md`.
2. Resolved entries older than 60 days are moved to the archive file.
3. Active entries remain in the main file.
4. The archive file is read-only — no agent writes to it after creation.

This prevents memory files from growing unbounded while preserving the full history.
