# Game Spec: Example Game

> This is the example game included to demonstrate the spec format and system flow.

---

## Game Title
Sword Arena

## Concept
A competitive PvP arena game where players equip swords, dash around an arena, and try to eliminate each other to earn points and climb the leaderboard.

---

## Genre and Target Audience

**Genre:** Fighting

**Target age range:** 10–18

**Target session length:** 10–20 minutes per session

**Player description:** Players who enjoy fast-paced PvP combat with skill-based mechanics. They want to feel powerful when they land a combo, and to have a clear sense of progression through the leaderboard.

---

## Core Game Loop

**Every 30 seconds, the player:**
Attacks other players with a sword, uses the dash ability to dodge or close distance, and earns points for hits and eliminations.

**Every 5 minutes, the player:**
Completes one match round, sees their rank on the leaderboard, and chooses whether to rematch or leave. Earns XP regardless of outcome.

**Every session, the player:**
Earns enough XP to level up at least once, unlocking access to a cosmetic or bragging-rights milestone. Sees their rank improve or stabilise relative to other players.

---

## Feature List

### Feature 1: Sword Combat
Players spawn with a default sword. Left-click swings the sword. Hitting another player deals 25 damage. Players have 100 HP. When a player's HP reaches 0, they are eliminated and respawn after 3 seconds. Eliminations award 10 points; hits award 1 point.

### Feature 2: Dash Ability
Players have a dash ability triggered by pressing Q. The dash launches the player 15 studs in the direction they are moving (or forward if stationary). Cooldown is 2 seconds. There is a brief invincibility frame (0.2 seconds) during the dash that makes the player immune to sword hits.

### Feature 3: Leaderboard
A real-time per-server leaderboard shows the top 10 players by current match score. Updated every 5 seconds. Displayed as a SurfaceGui on a scoreboard model in the arena. The leaderboard resets at the start of each match round.

### Feature 4: Match Rounds
Matches last 5 minutes. A countdown timer is displayed in a ScreenGui for all players. When time expires, the leaderboard freezes, the top 3 players are announced in a ScreenGui, and a 15-second intermission begins before the next round starts. All scores reset at the start of a new round.

### Feature 5: XP and Leveling
Players accumulate XP across sessions (stored in DataStore). Each elimination awards 20 XP; each hit awards 2 XP. When enough XP is accumulated, the player levels up. Level is displayed next to the player's name on the leaderboard. XP thresholds: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 250 XP, each subsequent level requires 50% more XP than the previous.

### Feature 6: Arena Map
A flat circular arena (50-stud radius) with 4 raised platforms at the cardinal directions for positional advantage. The floor has a stone texture. The platforms have a height of 5 studs and ramps for access. The arena is enclosed by an invisible kill barrier at its edges — falling off triggers respawn without counting as an elimination.

---

## Art Direction

**Visual style:** Roblox-native blocky with slightly rounded edges

**Colour palette:** Dark stone greys and warm torch-light amber — medieval dungeon atmosphere

**Asset mood:** Chunky, sturdy, slightly worn, fantasy

**Reference games:** Classic sword-fighting games with arena PvP — simple and readable at a glance

---

## Monetisation Model

**Primary model:** Cosmetic-only

**Game passes:**
- Fancy Sword Trail: adds a particle trail effect to the sword swing, 50 Robux
- Golden Sword Skin: reskins the sword to a golden appearance, 75 Robux

**Developer products:** None

**VIP servers:** Yes — 10 Robux/month for a private server

**Notes:** No pay-to-win. All gameplay mechanics are identical regardless of purchases.

---

## Technical Constraints

**Required Roblox services:**
- DataStoreService — for XP and level persistence
- MarketplaceService — for game pass checks
- Players — for player management

**Performance targets:**
- Target frame rate: 60fps client minimum
- Max concurrent players per server: 16
- Platforms: PC and Mobile

**Other constraints:**
- Server-side validation is required for all combat actions (damage must be applied server-side only)
- No third-party modules

---

## Out of Scope

- Team-based modes (this is free-for-all only in v1)
- Cross-server leaderboards or global rankings
- Crafting or inventory systems
- Map rotation or multiple maps
- Chat moderation features

---

## Success Criteria

- [ ] A player can join the game, understand how to fight, and participate in a match within 2 minutes with no instructions.
- [ ] Sword combat damage is applied server-side and cannot be exploited by a client sending fake hit events.
- [ ] The leaderboard updates in real-time during a match and resets correctly at the start of each round.
- [ ] XP persists correctly across sessions — a player who earns XP in one session sees the same total when they rejoin.
- [ ] The dash ability works on both PC (Q key) and mobile (a touch button visible in the screen).
- [ ] Game passes (sword trail and golden skin) are correctly gated — only players who own them see the effect.

---

## Open Questions

- Should the dash invincibility frame be visible to other players (brief flash effect) or invisible? Assume: visible flash — helps players understand they missed due to a dodge, not a bug.
- What happens to XP awarded during a round if a player disconnects before the round ends? Assume: XP is awarded on-hit and saved incrementally, not at round end.
