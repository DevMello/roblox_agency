# CLAUDE.md — Roblox Studio Agency

This file is the primary instruction set for any Claude Code instance operating in this repository. Read this file in full before taking any action.

---

## What This Repository Is

An autonomous multi-agent system that builds Roblox games. Agents run nightly, build from specs, open PRs, and report progress each morning. You are likely here because you are one of those agents, or because a human is asking you to help configure or extend the system.

---

## Session Start Protocol

At the start of every session:

1. Read `architecture.md` — understand the system architecture.
2. Fetch active games: `curl -s http://localhost:7432/api/v1/games/`
3. Fetch agency-level overrides for any active game (they are returned combined): `curl -s http://localhost:7432/api/v1/games/{game}/overrides`
4. Fetch agency-level blockers: `curl -s http://localhost:7432/api/v1/games/{game}/blockers`

Data that used to live in `memory/human-overrides.md`, `memory/blockers.md`, `memory/decisions.md`, and `games/registry.md` now lives in the database. Use the API endpoints above instead of reading those files.

If you are operating as a specific agent (Builder, Planner, QA, etc.), read your agent's `AGENT.md` before taking any action.

---

## Agent Identity

Identify which agent role you are filling before doing anything:

| Role | AGENT.md location | Primary output |
|------|------------------|---------------|
| Architect | `agents/architect/AGENT.md` | Plan milestones + tasks via API |
| Researcher | `agents/researcher/AGENT.md` | Inline research note + API cache |
| Planner | `agents/planner/AGENT.md` | Sprint log via API |
| Builder | `agents/builder/AGENT.md` | Game source files, PRs |
| QA | `agents/qa/AGENT.md` | PR verdicts (`qa-approved` / `qa-failed`) |
| Reporter | `agents/reporter/AGENT.md` | Morning report via API |
| Market Researcher | `agents/market-researcher/AGENT.md` | Weekly reports via API |

If you are not sure which role to fill, ask the human before proceeding.

---

## Absolute Rules (apply to all agents, no exceptions)

### Never do these things:
- **Never commit directly to `main`.** All changes go to branches. All branches go through PRs.
- **Never force-push** to any branch.
- **Never merge your own PRs.** PRs are merged by CI (after QA approval) or by a human.
- **Never call `POST /api/v1/games/{game}/overrides`** except as Builder acting on an explicit human live-edit request.
- **Never call plan, decisions, or blockers write endpoints** if you are Builder or QA (Builder uses blockers POST only for escalations; QA never writes to these).
- **Never skip QA.** A PR must have `qa-approved` before it can be merged (except manual human merges of `live-edit` PRs).
- **Never modify files in `agents/`, `config/`, `workflows/`, or `specs/`** unless you are explicitly asked to update the agency configuration itself (not a game task).
- **Never commit game files (anything under `games/*/`) to the agency repo** — game repos are external and gitignored.
- **Never guess at a fundamental design question in a spec.** Flag ambiguity and stop — do not implement a guess.
- **Never use `wait()`, `spawn()`, or `delay()` in Luau** — use `task.wait()`, `task.spawn()`, `task.delay()`.
- **Never access Roblox services as `game.ServiceName`** — always use `game:GetService("ServiceName")`.
- **Never write a Luau script without `--!strict` as the first line.**

### Always do these things:
- **Always read the sprint log before starting a task** as Builder — Planner may have updated it since last read.
- **Always validate client arguments on the server** — never trust RemoteEvent data from clients.
- **Always commit partial work to a branch before stopping** — never leave uncommitted work if interrupted.
- **Always write to `progress.md` after completing a task** — the append-only log is how future agents understand history.
- **Always check `memory/human-overrides.md` before generating a sprint** as Planner.
- **Always `git pull --rebase origin main` before starting each task** as Builder — another worker may have completed a dependency.
- **Always push sprint log updates immediately after each task** as Builder — `git push origin main`. If rejected, `git pull --rebase && git push`. Never batch sprint log updates.
- **Always check `config/worker-id` at session start** as Builder — only execute tasks assigned to your worker ID (or all tasks if `worker_id` is null everywhere).
- **Never execute tasks assigned to a different worker** — task reassignment is Planner's job, not Builder's.
- **Always write a heartbeat to `memory/workers/{worker-id}.md`** after each task if `config/worker-id` exists.

---

## Repository Structure

```
.github/workflows/       GitHub Actions (night cycle, morning report, weekly research)
agents/
  architect/             Spec → plan decomposition agent
  builder/               Code implementation agent (the only one that writes game files)
  market-researcher/     Weekly Roblox market analysis agent
  planner/               Sprint generation and monitoring agent
  qa/                    PR validation agent
  reporter/              Morning digest and weekly summary agent
  researcher/            API/pattern/asset lookup agent (called by others)
config/
  agent-limits.md        Token budgets, retry counts, cost guardrails
  mcp-servers.md         MCP server registry (URLs, auth, fallback policy)
  schedule.md            All time windows and agent activation order
games/
  registry.md            Committed list of active games and their repo URLs
  {game-name}/           (gitignored — external repo cloned here)
    spec.md              Human-written game spec (Architect reads this)
    plan.md              Living milestone plan (Architect creates, Planner updates)
    progress.md          Append-only build log (Builder writes after each task)
    sprint-log.md        Per-night structured sprint record (Planner writes, Builder/QA update)
    *.rbxl               Roblox place file (present when a Studio project exists for this game)
    src/                 Luau source files (Builder writes via Roblox Studio MCP)
    memory/
      state.md           Per-game state snapshot (Architect, Planner)
      blockers.md        Game-scoped blockers
      decisions.md       Game-scoped architectural decisions
      human-overrides.md Game-scoped human decision log (NEVER delete entries)
memory/
  blockers.md            Agency-level blockers
  decisions.md           Agency-level architectural decisions with rationale
  human-overrides.md     Agency-level append-only human decision log (NEVER delete entries)
  workers.md             Registered worker machines (written by register-worker.sh)
  workers/               Per-worker heartbeat files ({worker-id}.md, updated after each task)
reports/
  morning/{date}.md      Daily morning digest (Reporter generates at 5 am)
  weekly/                Weekly market research and game ideas
scripts/
  apply-live-edit.sh     Trigger an immediate human-requested change
  launch-morning-report.sh  Generate today's morning report
  launch-night-cycle.sh  Start the full night cycle (coordinator entry point)
  launch-weekly-research.sh  Start the weekly research run
  launch-worker.sh       Worker mode — execute tasks assigned to this machine
  register-worker.sh     One-time machine registration for multi-worker mode
specs/
  template.md            Canonical spec format (template only — active specs live in games/{game}/spec.md)
workflows/
  day-cycle.md           Human reviewer guide
  live-edit-protocol.md  Live edit step-by-step protocol
  night-cycle.md         Night cycle authoritative runbook
  pr-review-protocol.md  PR type handling and auto-merge rules
  weekly-research.md     Weekly research runbook
```

---

## API Write Permissions

All structured agent data is written through the HTTP API. The table below shows which agent may call which write endpoint.

| API endpoint | Who may call |
|-------------|-------------|
| `POST /api/v1/games/{game}/sprint-log` | Planner |
| `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}` | Planner |
| `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}` | Builder (status, timestamps, pr_reference), QA (qa_verdict, qa_notes) |
| `POST /api/v1/games/{game}/plan/milestones` | Architect |
| `PUT /api/v1/games/{game}/plan/milestones/{id}` | Architect, Planner |
| `POST /api/v1/games/{game}/plan/tasks` | Architect |
| `POST /api/v1/games/{game}/progress` | Builder, Researcher |
| `POST /api/v1/games/{game}/blockers` | Planner, Builder (escalations only), Human |
| `POST /api/v1/games/{game}/overrides` | Human (primary), Builder (live edits only) |
| `POST /api/v1/games/{game}/decisions` | Architect, Planner, Human |
| `POST /api/v1/games/{game}/research` | Researcher |
| `PUT /api/v1/games/{game}/state` | Architect, Planner |
| `POST /api/v1/workers/{worker_id}/heartbeat` | Builder |
| `POST /api/v1/reports/morning` | Reporter |
| `POST /api/v1/reports/weekly` | Market Researcher |

**Files that agents still read from disk (not in DB):**
| File | Who reads |
|------|----------|
| `games/{game}/spec.md` | Architect, Planner, Builder (context), QA |
| `specs/template.md` | Architect |
| `agents/researcher/sources.md` | Researcher |
| `agents/market-researcher/sources.md` | Market Researcher |
| `agents/reporter/templates/morning-report.md` | Reporter |
| `config/worker-id` | Builder (worker identity) |
| `agents/*/prompts/*.md` | All agents |
| `agents/*/schemas/*.json` | All agents |

**Files humans still write to disk:**
| File | Notes |
|------|-------|
| `games/{game}/spec.md` | Primary game definition — never modified by agents |
| `agents/`, `config/`, `workflows/`, `specs/` | Agency config — human only |

---

## Branch and Commit Conventions

**Branch naming:**
- `feature/{game-slug}/{task-id}` — new feature tasks
- `fix/{game-slug}/{pr-number}` — bug fixes
- `live/{game-slug}/{short-description}` — live edits

**Commit message format:**
```
[{game-slug}] {type}: {short description}
```
Types: `feat`, `fix`, `asset`, `config`, `ui`, `refactor`, `test`

Example: `[sword-game] feat: add dash mechanic with server validation`

---

## MCP Servers

All MCP operations go through these servers. See `config/mcp-servers.md` for full details.

| Server | Connection | Used by |
|--------|-----------|---------|
| Roblox Studio MCP | `%LOCALAPPDATA%\Roblox\mcp.bat` (batch file) | Builder only |
| Blender MCP | 3002 | Builder only |
| Chrome MCP | 3003 | Builder (docs), Researcher, Market Researcher |

GitHub operations (branches, commits, PRs, labels, comments) use the **GitHub CLI (`gh`)** — not an MCP server. See `.claude/skills/github-cli.md` for the full command reference. Verify authentication with `gh auth status` before starting any night cycle.

Before using the Roblox Studio MCP, verify that Roblox Studio is open and the batch file at `%LOCALAPPDATA%\Roblox\mcp.bat` exists. Before using any other MCP server, run its health check. If it fails after one retry, mark the affected task blocked — do not attempt to work around a missing MCP server.

---

## Agent HTTP API

All agent reads and writes go through the HTTP API at `http://localhost:7432/api/v1/`. The server must be running. There is no markdown fallback — agents do not write data to markdown files.

### Read endpoints (GET)

| Data | Endpoint |
|------|----------|
| Active games list | `GET /api/v1/games/` |
| Game detail + state | `GET /api/v1/games/{game}` |
| Game state | `GET /api/v1/games/{game}/state` |
| Current sprint log | `GET /api/v1/games/{game}/sprint-log` |
| Plan (milestones + tasks) | `GET /api/v1/games/{game}/plan` |
| Progress log | `GET /api/v1/games/{game}/progress` |
| Blockers (game + agency) | `GET /api/v1/games/{game}/blockers` |
| Overrides (game + agency) | `GET /api/v1/games/{game}/overrides` |
| Decisions (game + agency) | `GET /api/v1/games/{game}/decisions` |
| Research cache | `GET /api/v1/games/{game}/research?topic={topic}` |
| Workers | `GET /api/v1/workers` |
| Worker heartbeats | `GET /api/v1/workers/{worker_id}/heartbeats?limit=N` |
| Morning reports list | `GET /api/v1/reports/morning/` |
| Morning report by date | `GET /api/v1/reports/morning/{YYYY-MM-DD}` |
| Weekly report | `GET /api/v1/reports/weekly/{YYYY-WW}/{type}` |

### Write endpoints (POST / PATCH / PUT)

| Data | Endpoint |
|------|----------|
| Create sprint | `POST /api/v1/games/{game}/sprint-log` |
| Update sprint fields | `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}` |
| Update sprint task | `PATCH /api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}` |
| Create milestone | `POST /api/v1/games/{game}/plan/milestones` |
| Update milestone | `PUT /api/v1/games/{game}/plan/milestones/{milestone_id}` |
| Create plan task | `POST /api/v1/games/{game}/plan/tasks` |
| Append progress entry | `POST /api/v1/games/{game}/progress` |
| Add blocker | `POST /api/v1/games/{game}/blockers` |
| Resolve blockers | `POST /api/v1/games/{game}/blockers/resolve` |
| Add override | `POST /api/v1/games/{game}/overrides` |
| Add decision | `POST /api/v1/games/{game}/decisions` |
| Write research cache | `POST /api/v1/games/{game}/research` |
| Update game state | `PUT /api/v1/games/{game}/state` |
| Worker heartbeat | `POST /api/v1/workers/{worker_id}/heartbeat` |
| Write morning report | `POST /api/v1/reports/morning` |
| Write weekly report | `POST /api/v1/reports/weekly` |

All endpoints accept and return JSON. No authentication required (localhost only).

**Scope field for blockers, overrides, and decisions:**
- `scope: "game"` — affects only this game.
- `scope: "agency"` — cross-game or infrastructure-level. The GET endpoints for a given game always return both game-scoped and agency-scoped entries combined.

**Example — Builder appending a progress entry:**
```bash
curl -s -X POST http://localhost:7432/api/v1/games/industrial-tycoon/progress \
  -H "Content-Type: application/json" \
  -d '{"agent":"builder","task_id":"it-019","message":"Implemented currency system. PR #50 merged."}'
```

**Example — Planner writing a sprint:**
```bash
curl -s -X POST http://localhost:7432/api/v1/games/industrial-tycoon/sprint-log \
  -H "Content-Type: application/json" \
  -d '{"sprint_id":"industrial-tycoon-2026-05-19","date":"2026-05-19","milestone_ref":"industrial-tycoon-m2","status":"planned","total_estimated_minutes":240,"tasks":[...]}'
```

---

## Prompts Are Instructions

Files in `agents/*/prompts/` are step-by-step instructions for specific operations. When performing one of these operations, read the corresponding prompt file and follow it exactly. Do not improvise a process that already has a prompt.

| Operation | Prompt file |
|-----------|------------|
| Parse a spec into a task tree | `agents/architect/prompts/parse-spec.md` |
| Group tasks into milestones | `agents/architect/prompts/milestone-planner.md` |
| Map task dependencies | `agents/architect/prompts/dependency-mapper.md` |
| Generate nightly sprint | `agents/planner/prompts/nightly-sprint.md` |
| Replan after a failure | `agents/planner/prompts/replan-on-failure.md` |
| Triage a TBD PR | `agents/planner/prompts/pr-triage.md` |
| Check human overrides before sprint | `agents/planner/prompts/override-check.md` |
| Implement a feature task | `agents/builder/prompts/feature-impl.md` |
| Fix a bug | `agents/builder/prompts/bug-fix.md` |
| Integrate an asset | `agents/builder/prompts/asset-integration.md` |
| Open a PR | `agents/builder/prompts/pr-creation.md` |
| Apply a live edit | `agents/builder/prompts/live-edit.md` |
| Validate a feature PR | `agents/qa/prompts/feature-test.md` |
| Check for regressions | `agents/qa/prompts/regression-check.md` |
| Run a playtest | `agents/qa/prompts/playtest-eval.md` |
| Generate morning digest | `agents/reporter/prompts/morning-digest.md` |
| Generate tonight's plan section | `agents/reporter/prompts/tonights-plan.md` |
| Research an API | `agents/researcher/prompts/api-research.md` |
| Research a Luau pattern | `agents/researcher/prompts/pattern-research.md` |
| Find a marketplace asset | `agents/researcher/prompts/asset-research.md` |
| Analyse a competitor mechanic | `agents/researcher/prompts/competitor-analysis.md` |

---

## Schemas Are Contracts

Files in `agents/*/schemas/` define the exact shape of structured data. Any JSON output you produce for tasks, sprints, or milestones must be validated against the relevant schema before being written to disk.

| Schema | What it validates |
|--------|------------------|
| `agents/architect/schemas/task-tree.schema.json` | Task tree from Architect |
| `agents/architect/schemas/milestone.schema.json` | Milestone objects in plan.md |
| `agents/planner/schemas/sprint.schema.json` | Nightly sprint in sprint-log.md |
| `agents/planner/schemas/task.schema.json` | Individual task in a sprint |

---

## Failure Handling

If you are Builder and hit a failure:
1. Mark the task `failed` in the sprint log with `failure_reason` filled in.
2. Commit any partial work with a `[wip]` commit message prefix.
3. Open a draft PR for the partial work.
4. Stop. Do not attempt a 4th try. Do not move to the next task until Planner acknowledges.

The maximum attempt count for any task is 3. After 3 failed attempts, the task is permanently marked failed and goes to `memory/blockers.md`.

If you are Planner and detect a failure, apply `agents/planner/prompts/replan-on-failure.md`.

---

## Human Override Priority

Human decisions always override agent decisions. Before any action that might conflict with a human choice:

1. Check `memory/human-overrides.md` (agency-level) for active entries relevant to the feature or file you are about to touch.
2. Check `games/{game}/memory/human-overrides.md` (game-level) for active entries relevant to the specific game you are working on.
3. If a conflict exists in either file: stop. Do not implement the conflicting work. Log the conflict in the sprint log's `conflict_warnings` field.
4. Escalate via the morning report — not in real-time.

An active override is never reversed by an agent. Only a human (via a new override entry that supersedes the old one) can change what an override covers.

---

## Luau Code Quality (Quick Reference)

Every Luau script Builder writes must:
- Start with `--!strict`
- Use `game:GetService()` for all services (at top of file)
- Use `task.wait()` / `task.spawn()` / `task.delay()` (never the deprecated equivalents)
- Have typed function parameters and return types
- Have no bare `print()` statements (use `DEBUG_MODE` guard)
- Have no magic numbers (use a constants module)
- Validate all RemoteEvent server handlers against client arguments

See `agents/qa/checklists/luau-lint.md` for the full 26-rule checklist QA applies.

---

## How to Start a New Game (Human Reference)

1. Run `./scripts/new-game.sh {game-name}` — creates an external git repo cloned into `games/{game-name}/` and registers it in `games/registry.md`.
2. Fill in all sections of `games/{game-name}/spec.md` (use `specs/template.md` as a reference).
3. Run `./scripts/launch-night-cycle.sh`

The system detects the new spec automatically and runs Architect on the first night.

---

## Cost Guardrails

Nightly API spend cap: **$5.00 USD**. Weekly research cap: **$2.00 USD**.

When the cap is hit: Builder winds down immediately, Planner writes partial status, Reporter flags it in the morning digest. A human can raise the cap for one night by adding a `cost-cap-override` entry to `memory/human-overrides.md` before 11 pm.
