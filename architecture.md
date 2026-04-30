# READ THIS FIRST

This file defines the structure of the codebase.

If you are an AI:
- Read this file before accessing any other files
- Use it to decide what to open
- Do not explore the repo blindly

# Project Architecture

## High-Level Overview

An autonomous multi-agent system that builds Roblox games from human-written specs. Agents run nightly (11 pm–5 am ET) on a scheduled GitHub Actions workflow: Planner generates a sprint, Builder implements tasks in Roblox Studio via MCP, QA validates each PR, and Reporter delivers a morning digest. Humans write specs and review morning reports; the system handles everything in between. A multi-machine worker mode allows parallel task execution across registered machines.

---

## Directory Map

| Directory | Purpose |
|-----------|---------|
| `agents/` | One subdirectory per agent role — AGENT.md, prompts, schemas, reference docs |
| `config/` | Operational constraints: MCP server registry, schedule windows, cost caps, token limits |
| `games/` | Per-game runtime state: plan, sprint log, progress log, override copy. Active games: `example-game`, `industrial-tycoon`, `tycoon-game` |
| `memory/` | Persistent cross-session state: human overrides, decisions, blockers, worker heartbeats |
| `reports/` | Generated output: daily morning digests, weekly market analysis, game idea proposals |
| `scripts/` | Shell entry points: night cycle launcher, worker launcher, live-edit trigger, registration |
| `specs/` | Human-written game specifications (source of truth for Architect) |
| `workflows/` | Authoritative runbooks for night cycle, day cycle, live edits, PR review |
| `.github/workflows/` | GitHub Actions: schedule night cycle, morning report, weekly research |
| `logs/` | Runtime logs from night cycle and worker sessions |

---

## Key Modules

### Architect
- **Files**: `agents/architect/AGENT.md`, `agents/architect/prompts/`, `agents/architect/schemas/`
- **Purpose**: Reads a game spec and decomposes it into a validated task tree grouped into milestones. Runs once per new spec, not nightly.
- **Key artifacts**: `task-tree.schema.json`, `milestone.schema.json`
- **Dependencies**: `specs/{game}/spec.md` → writes `games/{game}/plan.md`, `memory/decisions.md`

### Planner
- **Files**: `agents/planner/AGENT.md`, `agents/planner/prompts/`, `agents/planner/schemas/`
- **Purpose**: Generates nightly sprints from `plan.md`, assigns tasks to workers, monitors progress every 30 min, replans on failure.
- **Key artifacts**: `sprint.schema.json`, `task.schema.json`
- **Key prompts**: `nightly-sprint.md`, `override-check.md`, `replan-on-failure.md`, `worker-assignment.md`
- **Dependencies**: `games/{game}/plan.md`, `memory/human-overrides.md`, `memory/blockers.md` → writes `games/{game}/sprint-log.md`

### Builder
- **Files**: `agents/builder/AGENT.md`, `agents/builder/prompts/`, `agents/builder/mcp-usage/`
- **Purpose**: The only agent that writes game source code. Implements tasks via Roblox Studio MCP, commits to feature branches, opens PRs.
- **Key prompts**: `feature-impl.md`, `bug-fix.md`, `asset-integration.md`, `pr-creation.md`, `live-edit.md`
- **Dependencies**: `games/{game}/sprint-log.md`, Roblox Studio MCP, Blender MCP, Chrome MCP, `config/worker-id` → writes game source files, `games/{game}/progress.md`, `memory/workers/{id}.md`

### QA
- **Files**: `agents/qa/AGENT.md`, `agents/qa/prompts/`, `agents/qa/checklists/`
- **Purpose**: Validates every PR against spec and a 26-rule Luau lint checklist. Issues `qa-approved` or `qa-failed` GitHub labels. Runs in parallel with Builder.
- **Key artifacts**: `luau-lint.md` (26 rules), `roblox-publish.md`
- **Key prompts**: `feature-test.md`, `regression-check.md`, `playtest-eval.md`
- **Dependencies**: Open PR, Roblox Studio MCP → writes verdict to `games/{game}/sprint-log.md`

### Reporter
- **Files**: `agents/reporter/AGENT.md`, `agents/reporter/prompts/`, `agents/reporter/templates/`
- **Purpose**: Generates human-readable morning digest and weekly summary. Read-only — never modifies game files.
- **Key prompts**: `morning-digest.md`, `tonights-plan.md`, `weekly-summary.md`
- **Dependencies**: `games/*/sprint-log.md`, `games/*/progress.md`, `memory/blockers.md` → writes `reports/morning/{date}.md`

### Market Researcher
- **Files**: `agents/market-researcher/AGENT.md`, `agents/market-researcher/prompts/`, `agents/market-researcher/sources.md`
- **Purpose**: Runs Sunday 2 am, scrapes top Roblox games, analyses monetisation, identifies gaps, proposes new game ideas.
- **Key prompts**: `trending-scan.md`, `revenue-analysis.md`, `gap-analysis.md`, `idea-generation.md`
- **Dependencies**: Chrome MCP, permitted external sites → writes `reports/weekly/`

### Researcher
- **Files**: `agents/researcher/AGENT.md`, `agents/researcher/prompts/`, `agents/researcher/sources.md`
- **Purpose**: On-demand lookup agent called by Architect and Builder. Confirms Roblox API signatures, finds assets, analyses competitor mechanics. Never writes game code.
- **Key prompts**: `api-research.md`, `pattern-research.md`, `asset-research.md`, `competitor-analysis.md`
- **Dependencies**: Chrome MCP, Creator Docs, DevForum → caches results in `games/{game}/progress.md`

### Memory System
- **Files**: `memory/human-overrides.md`, `memory/decisions.md`, `memory/blockers.md`, `memory/game-states/`, `memory/workers.md`, `memory/workers/{id}.md`
- **Purpose**: Persistent state store shared across all agents and sessions. Append-only for overrides; blockers resolved in-place with timestamp.
- **Key invariants**: `human-overrides.md` is never deleted by agents; only humans (or Builder on human's behalf) may write to it.

### tycoon-game
- **Files**: `games/tycoon-game/tycoon.rbxl`, `games/tycoon-game/plan.md` (pending), `games/tycoon-game/sprint-log.md` (pending), `games/tycoon-game/progress.md` (pending)
- **Purpose**: Active Roblox tycoon game project. Contains the Studio place file (`tycoon.rbxl`). Tracking files (plan, sprint-log, progress) are created by Architect and Planner once a spec exists at `specs/tycoon-game/spec.md`.
- **Dependencies**: Roblox Studio MCP (Builder), `specs/tycoon-game/spec.md` (Architect reads), `games/tycoon-game/sprint-log.md` (Builder and QA write)

### Night Cycle Orchestration
- **Files**: `scripts/launch-night-cycle.sh`, `scripts/launch-worker.sh`, `workflows/night-cycle.md`, `.github/workflows/night-cycle.yml`
- **Purpose**: Entry point that sequences all agents 11 pm–5 am. Coordinator mode runs full cycle; worker mode polls sprint log and executes assigned tasks only.
- **Dependencies**: GitHub CLI (`gh`), all three MCP servers, GitHub Actions scheduler

---

## Data Flow

```
Human writes spec
  → specs/{game}/spec.md

Architect reads spec
  → games/{game}/plan.md  (milestone + task tree)
  → memory/decisions.md

Planner reads plan + human-overrides + blockers
  → games/{game}/sprint-log.md  (nightly task assignments)

Builder reads sprint-log (per assigned worker_id)
  → git pull --rebase origin main
  → implements via Roblox Studio MCP / Blender MCP
  → commits to feature/{game}/{task-id} branch
  → opens PR
  → appends to games/{game}/progress.md
  → writes heartbeat to memory/workers/{id}.md
  → pushes sprint-log status update immediately

QA reads PR (parallel with Builder)
  → validates against luau-lint checklist + spec
  → applies qa-approved OR qa-failed label to PR
  → updates sprint-log qa_verdict

CI auto-merges qa-approved PRs to main

Reporter reads all sprint-logs + progress + blockers
  → reports/morning/{date}.md

Human reads morning report
  → reviews PRs, issues live-edit requests, updates spec
```

---

## External Dependencies

| Dependency | Role | Used By |
|------------|------|---------|
| Roblox Studio MCP | Read/write Luau scripts, modify Workspace | Builder, QA |
| Blender MCP (`localhost:3002`) | 3D asset generation and export | Builder |
| Chrome MCP (`localhost:3003`) | Documentation lookup, site scraping | Builder, Researcher, Market Researcher |
| GitHub CLI (`gh`) | Branches, commits, PRs, labels, comments | All agents |
| GitHub Actions | Scheduled nightly triggers | Orchestration layer |
| Roblox Creator Docs / DevForum | API reference | Researcher |
| Roblox top charts / Rolimons / RTrack | Market data | Market Researcher |

---

## State Management

| State | Location | Updated By | Update Model |
|-------|----------|------------|-------------|
| Game plan (milestones/tasks) | `games/{game}/plan.md` | Architect → Planner | Overwrite |
| Nightly sprint | `games/{game}/sprint-log.md` | Planner (write), Builder (status), QA (verdict) | In-place field updates, pushed immediately |
| Build history | `games/{game}/progress.md` | Builder | Append-only |
| Human decisions | `memory/human-overrides.md` | Human (primary) | Append-only, never deleted |
| Architectural decisions | `memory/decisions.md` | Architect, Planner, Human | Append |
| Active blockers | `memory/blockers.md` | Planner, Builder, QA | Resolved in-place with timestamp |
| Worker liveness | `memory/workers/{id}.md` | Builder (after each task) | Overwrite (heartbeat) |
| Game state snapshot | `memory/game-states/{game}.md` | Architect, Planner | Overwrite |

---

## Entry Points

| Script / File | Trigger | What it starts |
|---------------|---------|---------------|
| `scripts/launch-night-cycle.sh` | GitHub Actions (`night-cycle.yml`) at 11 pm ET | Full agent sequence: Architect (if needed) → Planner → Builder + QA → Reporter |
| `scripts/launch-worker.sh` | Manual or via coordinator on worker machines | Worker mode: polls sprint log, executes assigned tasks only |
| `scripts/launch-morning-report.sh` | GitHub Actions (`morning-report.yml`) at 5 am ET | Reporter only |
| `scripts/launch-weekly-research.sh` | GitHub Actions (`weekly-research.yml`) Sunday 2 am ET | Market Researcher |
| `scripts/apply-live-edit.sh` | Human invocation during day cycle | Records override → Builder live-edit branch |
| `scripts/register-worker.sh` | One-time per machine | Creates `config/worker-id`, appends to `memory/workers.md` |

---

## Known Constraints

- **Cost caps**: $5.00/night (all agents), $2.00/week (market research). Agents wind down on breach.
- **Task retry limit**: 3 attempts per task. On 3rd failure → `memory/blockers.md`, no further retries.
- **MCP rate limits**: Roblox Studio 60 ops/min (1 session), Blender 30 ops/min (1 session), Chrome 120 req/min (5 tabs).
- **Time budgets**: Builder 10–90 min/task, QA 20 min/PR, Reporter 30 min, Planner sprint-gen 15 min.
- **Sprint log must be pushed immediately** after each task update — never batched.
- **No deprecated Luau APIs**: `wait()`, `spawn()`, `delay()`, `game.ServiceName` are banned; `task.*` equivalents required.
- **`--!strict` required** on every Luau script.
- **All RemoteEvent handlers** must validate client arguments server-side.
- **Builder never commits to `main`** — all work through PRs with `qa-approved` label.
- **Human overrides are permanent** — agents cannot delete or override them; only supersede with a newer entry.

---

## Gaps / Unclear Areas

- **Architect activation trigger**: CLAUDE.md says "once per new spec," but the night-cycle workflow's exact detection mechanism (how it knows a spec is new) is not explicit in scripts.
- **QA playtest access**: `playtest-eval.md` implies QA runs Roblox Studio playtests — unclear if QA shares the same Studio MCP session as Builder or uses a separate one.
- **Multi-machine coordinator**: `launch-night-cycle.sh` acts as coordinator, but the handoff protocol (how workers know when the sprint log is ready to poll) is in the runbook, not enforced by a locking mechanism in code.
- **`config/worker-id` absence**: In single-machine mode the file may not exist; agents are expected to run all tasks, but the exact fallback behaviour is documented in AGENT.md per agent rather than centrally.
- **Chrome MCP permitted sites**: `agents/researcher/sources.md` and `agents/market-researcher/sources.md` list authorised sources, but there is no enforcement layer — compliance is convention only.
- **PR auto-merge rules**: `workflows/pr-review-protocol.md` defines auto-merge conditions, but it is unclear which GitHub Actions workflow or CI step actually triggers the merge after `qa-approved` is applied.

---

## Change Log

- **2026-04-30**: Moved `roblox-tycoon/` → `games/tycoon-game/`. Placed under `games/` to align with the per-game runtime state convention. Place file `tycoon.rbxl` colocated with future plan/sprint-log/progress tracking files.
