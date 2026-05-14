# Memory System — Operating Manual

The memory system persists human intent and agent decisions across nights so context is never lost between sessions. These files are the most important files in the repository because they are the source of truth for decisions that are not visible in the code itself.

---

## Memory Split: Agency vs Game

As of the game-repo isolation refactor, memory is split into two scopes:

- **`memory/`** (this directory) — **Agency-level state only.** Cross-game decisions, system-wide blockers, human overrides that span all games, and worker registration. These files live in the agency repo.
- **`games/{game-name}/memory/`** — **Game-specific state.** Per-game blockers, per-game architectural decisions, and per-game human overrides. These files live with the game (eventually in the game's own repository).

`memory/game-states/` is no longer used for active state. Per-game state snapshots have moved to `games/{game-name}/memory/`. The `memory/game-states/` directory is retained for historical reference only — do not write new files there.

---

## Files

### `memory/human-overrides.md`
**What it tracks:** Every change or decision a human has made or requested at the agency level. The permanent record of human intent for cross-game and system-wide decisions.

**Game-specific overrides:** Live at `games/{game-name}/memory/human-overrides.md`.

**Who can write:** Humans directly, or Builder on behalf of a human (during live edits). Planner and other agents are read-only.

**Write frequency:** Any time a human makes a change request or decision. Never deleted.

**Key property:** Append-only. Entries are superseded but never deleted. This means the full history of human decisions is always recoverable.

---

### `memory/decisions.md`
**What it tracks:** Significant architectural and design decisions made by agents at the **agency level** (agent system design, workflow conventions, cross-game patterns). Not game-specific implementation decisions.

**Game-specific decisions:** Live at `games/{game-name}/memory/decisions.md`.

**Who can write:** Architect (after planning runs) and Planner (after each night cycle). Builder and QA are read-only. Humans may add entries manually.

**Write frequency:** After each Architect run and each night cycle if decisions were made.

**Key property:** Decisions are never overwritten — they are either still active or marked "revisited" with a new decision entry. This prevents agents from repeatedly making the same decision in different ways.

---

### `memory/blockers.md`
**What it tracks:** Agency-level blockers only — system-wide issues that affect the agency itself (MCP server outages, worker machine failures, cost cap hits, etc.). Not game-specific task blockers.

**Game-specific blockers:** Live at `games/{game-name}/memory/blockers.md`.

**Who can write:** Planner (adds and resolves blockers), Builder (adds blockers when it hits failures), QA (adds blockers on escalations). Read-only for Reporter.

**Write frequency:** Whenever a new agency-level blocker is identified; whenever a blocker is resolved.

**Key property:** Resolved blockers are marked with a timestamp, not deleted. This creates a history of what problems were encountered and how they were resolved.

---

### `memory/game-states/{game-name}.md`
**Status: DEPRECATED.** Per-game state snapshots have moved to `games/{game-name}/memory/`. This directory is retained for historical reference only. Do not write new files here.

---

### `memory/workers.md`
**What it tracks:** Registered worker machines — their IDs, capabilities, and last-seen timestamps.

**Who can write:** `register-worker.sh` (appends new entries), Builder (updates `Last seen:` field after each task).

---

### `memory/workers/{worker-id}.md`
**What it tracks:** Per-worker heartbeat files. Written after every task to confirm the worker is alive and which task it last completed.

**Who can write:** Builder (heartbeat after each task), `launch-worker.sh`.

---

## Write Permissions Summary

| File | Architect | Planner | Builder | QA | Reporter | Human |
|------|-----------|---------|---------|-----|---------|-------|
| `human-overrides.md` | — | read | write (on behalf of human) | — | read | **write** |
| `decisions.md` | **write** | **write** | read | — | read | write |
| `blockers.md` | — | **write** | **write** | write (escalations) | read | write |
| `game-states/{name}.md` | deprecated | deprecated | deprecated | — | — | — |
| `workers.md` | — | — | **write** | — | — | — |
| `workers/{id}.md` | — | — | **write** | — | — | — |
| `games/{game}/memory/decisions.md` | **write** | **write** | read | — | read | write |
| `games/{game}/memory/blockers.md` | — | **write** | **write** | write (escalations) | read | write |
| `games/{game}/memory/human-overrides.md` | — | read | write (on behalf of human) | — | read | **write** |

---

## How Planner Uses Memory

At the start of every night:
1. Reads `memory/human-overrides.md` — identifies active agency-level overrides.
2. Reads `games/{game-name}/memory/human-overrides.md` — identifies active game-scoped overrides.
3. Reads `memory/blockers.md` — identifies agency-level blockers (e.g. worker down, MCP server offline).
4. Reads `games/{game-name}/memory/blockers.md` — identifies game-specific task blockers.
5. Reads `memory/decisions.md` — ensures tonight's sprint does not contradict agency-level architectural decisions.
6. Reads `games/{game-name}/memory/decisions.md` — ensures tonight's sprint does not contradict game-level decisions.

At the end of every night:
1. Writes new agency-level blockers and decisions to `memory/blockers.md` and `memory/decisions.md`.
2. Writes new game-level blockers and decisions to `games/{game-name}/memory/blockers.md` and `games/{game-name}/memory/decisions.md`.

---

## How Reporter Uses Memory

Each morning:
1. Reads `memory/blockers.md` — surfaces active agency-level blockers in the morning report.
2. Reads `games/{game-name}/memory/blockers.md` — surfaces active game-level blockers.
3. Reads `memory/decisions.md` — notes significant new agency-level decisions in the report.
4. Does not write to any memory file.

---

## Archiving Policy

When any memory file exceeds 500 lines:
1. Planner creates an archive file: `memory/archive/{filename}-{YYYY-MM}.md`.
2. Resolved entries older than 60 days are moved to the archive file.
3. Active entries remain in the main file.
4. The archive file is read-only — no agent writes to it after creation.

This prevents memory files from growing unbounded while preserving the full history.
