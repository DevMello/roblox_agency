# Game Repo Template

This repository was initialized by the [roblox-studio-agency](https://github.com/DevMello/roblox-studio-agency) autonomous build system.

## What This Repo Is

Each Roblox game built by the agency lives in its own repository. This repo contains the spec, plan, sprint log, progress log, and source files for a single game. The agency clones it locally into `games/{game-name}/` and uses it as the working directory for all build activity.

## Repository Layout

```
spec.md             # Human-written game spec — fill this in first
plan.md             # Architect generates this from spec.md
sprint-log.md       # Planner writes the nightly sprint here
progress.md         # Builder appends a line after each completed task
overrides.md        # Builder writes live-edit decisions here
src/                # Luau source files — Builder writes via Roblox Studio MCP
memory/
  state.md          # Current game state snapshot (Architect/Planner)
  blockers.md       # Active blockers (Planner, Builder, QA)
  decisions.md      # Architectural decisions (Architect, Planner, human)
  human-overrides.md  # Human decisions — append-only, never delete
```

## Getting Started

1. Edit `spec.md` — replace all `[TODO: fill in]` placeholders with your game's details.
2. Register this repo with the agency by running `scripts/new-game.sh` in the agency repo.
3. The agency will run Architect on the next night cycle to generate `plan.md`.

## Agency Documentation

All agency configuration, agent instructions, and workflows live in the agency repository. See the agency `CLAUDE.md` and `architecture.md` for the full system documentation.
