# Sword Arena — Plan

> Created by Architect on 2026-04-28.
> This is the example game included in the repository to demonstrate plan format.

---

## Status

Active milestone: M1 — Core Infrastructure and Combat
Last updated: 2026-04-28
Overall progress: 0% (development not yet started)

---

## Milestones

### M1 — Core Infrastructure and Combat
**Goal:** A player can join the game, pick up a sword, swing it at another player, deal damage, and die and respawn.
**Estimated nights:** 3
**Actual nights:** 0
**Status:** pending
**Critical path:** yes
**Tasks:** EG-001, EG-002, EG-003, EG-004, EG-005
**Success criteria:**
- Player spawns with a sword in hand.
- Left-click swing deals 25 server-validated damage to a target.
- Player at 0 HP is eliminated and respawns after 3 seconds.
- Dash ability launches player 15 studs with 2-second cooldown.
- Dash invincibility frame prevents damage for 0.2 seconds.

### M2 — Match System and Leaderboard
**Goal:** The game runs timed 5-minute match rounds with a per-server leaderboard that resets between rounds.
**Estimated nights:** 3
**Actual nights:** 0
**Status:** pending
**Critical path:** yes (depends on M1)
**Tasks:** EG-006, EG-007, EG-008
**Success criteria:**
- Match timer counts down from 5:00 visible to all players.
- Leaderboard shows top 10 by score, updates every 5 seconds.
- Top 3 announced at round end; scores reset on new round start.

### M3 — XP, Levels, and DataStore
**Goal:** Players earn and persist XP across sessions; level is displayed on the leaderboard.
**Estimated nights:** 2
**Actual nights:** 0
**Status:** pending
**Critical path:** yes (depends on M2)
**Tasks:** EG-009, EG-010
**Success criteria:**
- XP is saved to DataStore on-hit and on-elimination.
- XP persists correctly between sessions.
- Level calculated from XP thresholds and displayed next to player name.

### M4 — Arena Map and Monetisation
**Goal:** The arena is fully built and game passes are functional.
**Estimated nights:** 2
**Actual nights:** 0
**Status:** pending
**Critical path:** no (can begin after M1 is complete)
**Tasks:** EG-011, EG-012, EG-013
**Success criteria:**
- Arena map is built (circular 50-stud radius, 4 platforms, stone texture).
- Kill barrier is in place and triggers respawn correctly.
- Game passes (sword trail, golden skin) checked correctly via MarketplaceService.
- Mobile dash button visible and functional.

---

## Task Index

| Task ID | Title | Type | Milestone | Status | PR |
|---------|-------|------|-----------|--------|-----|
| EG-001 | Set up game constants module | config | M1 | pending | — |
| EG-002 | Declare RemoteEvents module | config | M1 | pending | — |
| EG-003 | Implement server-side combat handler | scripting | M1 | pending | — |
| EG-004 | Implement dash mechanic (server + client) | game-mechanic | M1 | pending | — |
| EG-005 | Player spawn and respawn system | scripting | M1 | pending | — |
| EG-006 | Match round manager (timer + round state) | scripting | M2 | pending | — |
| EG-007 | Per-server leaderboard (SurfaceGui) | ui | M2 | pending | — |
| EG-008 | Round-end announcement UI | ui | M2 | pending | — |
| EG-009 | DataStore XP persistence module | data | M3 | pending | — |
| EG-010 | Level calculation and display | scripting | M3 | pending | — |
| EG-011 | Arena map build and kill barrier | asset | M4 | pending | — |
| EG-012 | Game pass integration (MarketplaceService) | scripting | M4 | pending | — |
| EG-013 | Mobile dash button (ScreenGui) | ui | M4 | pending | — |

---

## Dependency Summary

### Critical chain
EG-001 → EG-002 → EG-003 → EG-004 → EG-005 → EG-006 → EG-007 → EG-009 → EG-010

### Task dependency table
| Task ID | Title | Hard depends on | Soft depends on |
|---------|-------|----------------|----------------|
| EG-001 | Constants module | — | — |
| EG-002 | RemoteEvents module | EG-001 | — |
| EG-003 | Server combat handler | EG-002 | — |
| EG-004 | Dash mechanic | EG-002, EG-003 | — |
| EG-005 | Spawn and respawn | EG-001 | — |
| EG-006 | Match round manager | EG-005 | EG-003 |
| EG-007 | Leaderboard SurfaceGui | EG-006 | — |
| EG-008 | Round-end announcement UI | EG-006 | EG-007 |
| EG-009 | DataStore XP module | EG-003 | EG-005 |
| EG-010 | Level display | EG-009 | EG-007 |
| EG-011 | Arena map | — | EG-001 |
| EG-012 | Game pass integration | EG-003 | EG-001 |
| EG-013 | Mobile dash button | EG-004 | — |

### Independent tasks (can start on night 1)
- EG-001: Constants module
- EG-011: Arena map (soft dependency on EG-001 only)

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-04-28 | Plan created | Initial spec processing by Architect |
