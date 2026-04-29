# Roblox Studio Agency

An autonomous multi-agent system that builds Roblox games while you sleep. Drop a spec file, run one script, and wake up to PRs.

---

## Overview

This repository is an AI-powered development agency that autonomously plans, builds, tests, and reports on Roblox game projects. Two primary AI actors divide responsibility across three daily operational windows. Humans review work each morning and leave feedback; agents execute each night.

---

## System Architecture

### Two Actors

**Claude Code (Builder)**
- The only agent that writes and modifies game source files.
- Runs during the night cycle (11 pm – 5 am).
- Reads the nightly sprint plan, implements tasks one by one, commits to branches, and opens PRs.
- Never touches `plan.md`, `memory/`, or any agent config file.

**Claude Cowork (Planner / Monitor)**
- Generates the nightly sprint plan and monitors Builder's progress throughout the night.
- Reads human overrides, blockers, and TBD PRs before every sprint.
- Intervenes and replans mid-night if a task fails or runs over time.
- Never modifies source files.

### Supporting Agents

| Agent | Role | When it runs |
|-------|------|-------------|
| Architect | Decomposes a new spec into a milestone plan | Once per new spec, or on spec change |
| Researcher | Looks up APIs, patterns, and assets | Called by Architect or Builder when needed |
| QA | Validates every Builder PR before merge | Triggered per PR (parallel with Builder) |
| Reporter | Generates the morning digest and tonight's plan | 5 am daily |
| Market Researcher | Scans Roblox charts and generates game ideas | Once weekly (Sunday) |

---

## Operational Schedule

### Night Cycle — 11 pm to 5 am (America/New_York)
1. **Planner** reads overrides, blockers, and TBD PRs, then generates tonight's sprint.
2. **Builder** reads the sprint and begins implementing tasks in order.
3. **QA** runs in parallel — triggered by each new PR Builder opens.
4. **Planner** monitors progress every 30 minutes and replans if needed.
5. At 5 am, Builder pauses, Planner writes final status, and Reporter is triggered.

### Morning Report — 5 am
Reporter generates `reports/morning/YYYY-MM-DD.md` summarising last night's work and previewing tonight's plan.

### Day Cycle — 5 am to 11 pm
Human reviews the morning report, approves or comments on PRs, and optionally requests live edits.

### Weekly Research — Sunday 2 am
Market Researcher scans Roblox charts, analyses monetisation, identifies gaps, and proposes new game ideas.

---

## How to Start a New Game

1. Copy `specs/template.md` to `specs/{your-game-name}/spec.md`.
2. Fill in all sections of the spec.
3. Run:
   ```bash
   ./scripts/launch-night-cycle.sh
   ```
   On the first run with a new spec, Architect activates automatically to decompose the spec into a plan before Builder starts.

That's it. The next morning your report will show what was built.

---

## Human Review Guide

Each morning, open:
```
reports/morning/YYYY-MM-DD.md
```

This file shows:
- What was completed, failed, or skipped last night.
- All PRs opened and their status.
- Active blockers that require your input.
- Tonight's planned tasks.

**PRs that need your review** are listed under "PRs awaiting human review." PRs that passed QA and carry no human-review label are auto-merged.

---

## Live Edit Guide

To request an immediate change during the day:
```bash
./scripts/apply-live-edit.sh "your change request in plain language"
```

Builder will:
1. Record the override in `memory/human-overrides.md` before touching any file.
2. Create a `live/{game-name}/{description}` branch.
3. Implement the change and open a PR labelled `live-edit`.
4. QA validates the PR.
5. You review and merge (or reject).

The change is permanently recorded in `games/{game-name}/overrides.md` so Planner will not reverse it.

---

## MCP Server Requirements

Four MCP servers are required. See `config/mcp-servers.md` for full details.

| Server | Purpose |
|--------|---------|
| Roblox Studio MCP | Read/write scripts, manipulate Workspace hierarchy |
| Blender MCP | Generate and export 3D assets |
| Chrome MCP | Documentation lookups, DevForum access |
| GitHub MCP | Branch, commit, PR, and label operations |

All servers must be running before the night cycle starts. The pre-flight check in `scripts/launch-night-cycle.sh` verifies connectivity.

---

## Repo Conventions

- **Never commit directly to `main`.** All changes go through PRs. The nightly automation depends on this.
- **Never edit `plan.md` by hand.** Only Architect and Planner write to plan files. Edit the spec instead.
- **Never edit `memory/` manually.** Memory files are agent-managed. Use the live-edit script to register human intent.
- **Never merge a PR that QA has blocked.** Blocked PRs carry the `qa-failed` label and must be fixed first.
- Branch naming: `feature/{game}/{task-id}`, `fix/{game}/{pr-number}`, `live/{game}/{description}`.
- Commit message format: `[{game}] {type}: {short description}` (e.g. `[sword-game] feat: add dash mechanic`).
