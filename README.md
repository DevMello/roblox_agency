# Roblox Studio Agency

An autonomous multi-agent system that builds Roblox games while you sleep. Drop a spec file, run one script, and wake up to PRs.

---

## Web UI

A browser-based control plane for managing games, monitoring runs, editing specs, and configuring the system.

**Quick start:**
```bash
pip install -e ./webui
agency
```

Opens `http://127.0.0.1:7432` in your browser. See [`webui/README.md`](webui/README.md) for full docs and options.

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

## Running Locally — Quick Start

### Prerequisites

Open **Git Bash** (not PowerShell, not CMD) and verify:

```bash
claude --version          # Claude Code CLI must be installed and authenticated
git --version             # git must be available
gh auth status            # GitHub CLI must be installed and authenticated
ls "$LOCALAPPDATA/Roblox/mcp.bat"  # Roblox Studio MCP batch file must exist
```

If `claude --version` fails, install Claude Code:
```bash
npm install -g @anthropic-ai/claude-code
claude   # run once to authenticate
```

If `gh auth status` fails, install and authenticate the GitHub CLI:
```bash
winget install GitHub.cli   # or download from https://cli.github.com
gh auth login
```

The Roblox Studio MCP is the official Roblox-provided MCP server. It is configured via `.mcp.json` in this repo and communicates through a batch file at `%LOCALAPPDATA%\Roblox\mcp.bat` (installed automatically when you install Roblox Studio). Open Roblox Studio before running the night cycle — the batch file must be present and Studio must be running for Builder to write game scripts.

### Step 1 — Initialize git (one-time)

```bash
git init
git config user.name "Your Name"
git config user.email "your@email.com"
git add .
git commit -m "init: agency setup"
```

### Step 2 — Create your game spec

```bash
bash scripts/new-game.sh your-game-name
```

Use lowercase letters and hyphens only (e.g. `sword-game`, `tower-defense`). This creates `specs/your-game-name/spec.md` from the template and opens it in VS Code. Fill in every section — the Architect reads all of them. Save and close when done.

### Step 3 — Run the Architect

```bash
bash scripts/run-architect.sh your-game-name
```

Takes 2–5 minutes. Reads your spec and writes `games/your-game-name/plan.md`. Read the plan — if anything looks wrong, edit the spec, add `REPLAN_REQUESTED` to the first line, and re-run.

### Step 4 — Run the night cycle

```bash
bash scripts/launch-night-cycle.sh your-game-name
```

This runs Planner → Builder → Reporter in sequence. The full run takes several hours. You can leave it overnight and check the morning report when you wake up.

### What to check after the run

| File | What it shows |
|------|--------------|
| `games/{game}/sprint-log.md` | What ran, what failed, what's blocked |
| `games/{game}/progress.md` | Append-only build log |
| `reports/morning/YYYY-MM-DD.md` | Summary of the night |
| `logs/night-cycle-YYYY-MM-DD.log` | Full output from every agent |

### Roblox Studio MCP

The Roblox Studio MCP uses the official Roblox-provided MCP server, configured in `.mcp.json`. It communicates via a batch file at `%LOCALAPPDATA%\Roblox\mcp.bat` — no localhost server is required. Roblox Studio must be open and running before the night cycle starts.

Without the Studio MCP available (i.e. the batch file is missing or Studio is not open), Builder will mark all scripting tasks blocked and no Luau files will be written. The night cycle will still run and produce logs, sprint records, and a morning report — you just won't get actual game scripts until the MCP is available.

---

## How to Start a New Game

1. Copy `specs/template.md` to `specs/{your-game-name}/spec.md`.
2. Fill in all sections of the spec.
3. Run:
   ```bash
   bash scripts/run-architect.sh your-game-name
   bash scripts/launch-night-cycle.sh your-game-name
   ```

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

Three MCP servers are required. See `config/mcp-servers.md` for full details.

| Server | Purpose |
|--------|---------|
| Roblox Studio MCP | Read/write scripts, manipulate Workspace hierarchy |
| Blender MCP | Generate and export 3D assets |
| Chrome MCP | Documentation lookups, DevForum access |

GitHub operations (branches, commits, PRs, labels) use the **GitHub CLI (`gh`)**, not an MCP server.

Roblox Studio MCP uses the official Roblox batch file (`%LOCALAPPDATA%\Roblox\mcp.bat`) — configured automatically via `.mcp.json`. Blender MCP must be running before the night cycle starts. The pre-flight check in `scripts/launch-night-cycle.sh` verifies the Roblox MCP batch file is present. Run `gh auth status` to confirm the GitHub CLI is authenticated.

---

## Multi-Machine Setup

Any number of machines can contribute to the same night cycle. Each machine runs its own Claude Code instance and Roblox Studio MCP — they share a single git repo as the coordination backbone.

### How it works

The **coordinator** runs the Planner, which reads the worker registry and pre-assigns each task to a specific machine before any building starts. Workers only execute their assigned tasks and push status updates after each one. No two machines ever race for the same task.

### Setup (one-time per machine)

```bash
# On every machine that will participate:
bash scripts/register-worker.sh my-machine-name
```

This creates a local `config/worker-id` file (gitignored) and adds the machine to `memory/workers.md` in the repo.

### Running a multi-machine night cycle

**Machine A — coordinator (also runs its own tasks):**
```bash
bash scripts/launch-night-cycle.sh sword-game
```
Planner assigns tasks across all registered workers, pushes the sprint log, then Builder on Machine A executes its assigned tasks.

**Every other machine — worker only:**
```bash
bash scripts/launch-worker.sh
```
Polls until the coordinator's sprint log appears, then executes only the tasks assigned to that machine.

**Coordinator-only mode** (if you want to separate Planner from building):
```bash
bash scripts/launch-night-cycle.sh --coordinator-only sword-game
# Then on ALL machines (including coordinator):
bash scripts/launch-worker.sh
```

### What each machine needs
- `claude` CLI installed and authenticated (can be different accounts per machine)
- Git configured and pointing to the same remote
- Roblox Studio MCP running locally on `localhost:3001` for scripting tasks
- Python 3 on PATH (`python3` or `python` — detected automatically by the scripts)

### Windows users
All scripts require **bash**. On Windows use **Git Bash** (ships with [Git for Windows](https://gitforwindows.org/)) or **WSL 2**. Do not run the scripts in PowerShell or CMD.

```
# Verify you have the right shell before running any script:
bash --version      # should print GNU bash
python3 --version   # or: python --version (Python 3.x required)
git --version
```

### Scaling beyond 2 machines
Register as many machines as you want with `register-worker.sh`. Planner distributes tasks round-robin weighted by estimated minutes, keeping dependency chains on the same worker when possible.

---

## Repo Conventions

- **Never commit directly to `main`.** All changes go through PRs. The nightly automation depends on this.
- **Never edit `plan.md` by hand.** Only Architect and Planner write to plan files. Edit the spec instead.
- **Never edit `memory/` manually.** Memory files are agent-managed. Use the live-edit script to register human intent.
- **Never merge a PR that QA has blocked.** Blocked PRs carry the `qa-failed` label and must be fixed first.
- Branch naming: `feature/{game}/{task-id}`, `fix/{game}/{pr-number}`, `live/{game}/{description}`.
- Commit message format: `[{game}] {type}: {short description}` (e.g. `[sword-game] feat: add dash mechanic`).
