# CLAUDE.md — Roblox Studio Agency

This file is the primary instruction set for any Claude Code instance operating in this repository. Read this file in full before taking any action.

---

## What This Repository Is

An autonomous multi-agent system that builds Roblox games. Agents run nightly, build from specs, open PRs, and report progress each morning. You are likely here because you are one of those agents, or because a human is asking you to help configure or extend the system.

---

## Session Start Protocol

At the start of every session, read these files in order:

1. `memory/README.md` — understand the memory system and write permissions.
2. `memory/human-overrides.md` — know what humans have decided. Never contradict active entries.
3. `memory/blockers.md` — know what is currently blocked before planning any work.
4. `memory/decisions.md` — know what architectural decisions have already been made.

If you are operating as a specific agent (Builder, Planner, QA, etc.), also read your agent's `AGENT.md` before taking any action.

---

## Agent Identity

Identify which agent role you are filling before doing anything:

| Role | AGENT.md location | Primary output |
|------|------------------|---------------|
| Architect | `agents/architect/AGENT.md` | `games/{game}/plan.md` |
| Researcher | `agents/researcher/AGENT.md` | Inline notes + `progress.md` research log |
| Planner | `agents/planner/AGENT.md` | `games/{game}/sprint-log.md` |
| Builder | `agents/builder/AGENT.md` | Game source files, PRs |
| QA | `agents/qa/AGENT.md` | PR verdicts (`qa-approved` / `qa-failed`) |
| Reporter | `agents/reporter/AGENT.md` | `reports/morning/{date}.md` |
| Market Researcher | `agents/market-researcher/AGENT.md` | `reports/weekly/` |

If you are not sure which role to fill, ask the human before proceeding.

---

## Absolute Rules (apply to all agents, no exceptions)

### Never do these things:
- **Never commit directly to `main`.** All changes go to branches. All branches go through PRs.
- **Never force-push** to any branch.
- **Never merge your own PRs.** PRs are merged by CI (after QA approval) or by a human.
- **Never modify `memory/human-overrides.md`** except as Builder acting on an explicit human live-edit request.
- **Never modify `plan.md`, `memory/decisions.md`, or `memory/blockers.md`** if you are Builder or QA.
- **Never skip QA.** A PR must have `qa-approved` before it can be merged (except manual human merges of `live-edit` PRs).
- **Never modify files in `agents/`, `config/`, `workflows/`, or `specs/`** unless you are explicitly asked to update the agency configuration itself (not a game task).
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
games/{game-name}/
  overrides.md           Game-scoped copy of active human overrides (read convenience)
  plan.md                Living milestone plan (Architect creates, Planner updates)
  progress.md            Append-only build log (Builder writes after each task)
  sprint-log.md          Per-night structured sprint record (Planner writes, Builder/QA update)
memory/
  blockers.md            All known blockers across all games
  decisions.md           Architectural decisions with rationale
  game-states/           Per-game state snapshots
  human-overrides.md     Append-only human decision log (NEVER delete entries)
reports/
  morning/{date}.md      Daily morning digest (Reporter generates at 5 am)
  weekly/                Weekly market research and game ideas
scripts/
  apply-live-edit.sh     Trigger an immediate human-requested change
  launch-morning-report.sh  Generate today's morning report
  launch-night-cycle.sh  Start the full night cycle
  launch-weekly-research.sh  Start the weekly research run
specs/
  template.md            Canonical spec format
  {game-name}/spec.md    Human-written game specs (Architect reads these)
workflows/
  day-cycle.md           Human reviewer guide
  live-edit-protocol.md  Live edit step-by-step protocol
  night-cycle.md         Night cycle authoritative runbook
  pr-review-protocol.md  PR type handling and auto-merge rules
  weekly-research.md     Weekly research runbook
```

---

## File Write Permissions

| File | Who may write |
|------|--------------|
| `games/{game}/plan.md` | Architect (create), Planner (update) |
| `games/{game}/sprint-log.md` | Planner (write), Builder (update task status), QA (update qa_verdict) |
| `games/{game}/progress.md` | Builder (append only) |
| `games/{game}/overrides.md` | Builder (during live edits) |
| `memory/human-overrides.md` | Human (primary), Builder (on behalf of human during live edits) |
| `memory/decisions.md` | Architect, Planner, Human |
| `memory/blockers.md` | Planner, Builder, QA (escalations), Human |
| `memory/game-states/*.md` | Architect, Planner |
| `reports/morning/*.md` | Reporter |
| `reports/weekly/*.md` | Market Researcher |
| Game source files (in Roblox Studio) | Builder only |
| `agents/`, `config/`, `workflows/`, `specs/` | Human only (or with explicit human instruction) |

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

| Server | Port | Used by |
|--------|------|---------|
| Roblox Studio MCP | 3001 | Builder only |
| Blender MCP | 3002 | Builder only |
| Chrome MCP | 3003 | Builder (docs), Researcher, Market Researcher |
| GitHub MCP | 3004 | Builder, Planner, QA, Reporter |

Before using any MCP server, run its health check. If it fails after one retry, mark the affected task blocked — do not attempt to work around a missing MCP server.

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

1. Check `memory/human-overrides.md` for active entries relevant to the feature or file you are about to touch.
2. If a conflict exists: stop. Do not implement the conflicting work. Log the conflict in the sprint log's `conflict_warnings` field.
3. Escalate via the morning report — not in real-time.

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

1. Copy `specs/template.md` → `specs/{game-name}/spec.md`
2. Fill in all sections of the spec.
3. Run `./scripts/launch-night-cycle.sh`

The system detects the new spec automatically and runs Architect on the first night.

---

## Cost Guardrails

Nightly API spend cap: **$5.00 USD**. Weekly research cap: **$2.00 USD**.

When the cap is hit: Builder winds down immediately, Planner writes partial status, Reporter flags it in the morning digest. A human can raise the cap for one night by adding a `cost-cap-override` entry to `memory/human-overrides.md` before 11 pm.
