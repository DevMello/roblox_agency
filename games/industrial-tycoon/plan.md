# Industrial Megamap Tycoon — Plan

## Status
Active milestone: industrial-tycoon-m3 (Lumber Production Chain)
Last updated: 2026-04-30

---

## OPEN QUESTIONS

The following open questions from the spec were NOT resolved by the Architect and must be answered by a human before the affected tasks can be scheduled:

> **OQ-1 (Boost Bucks conversion rate):** The spec states F2P players should be able to compete in 2–3 hours vs. Robux players in 30 min, but gives no Robux-to-Boost-Bucks ratio. Task `industrial-tycoon-024` (Boost Bucks implementation) has been created using a placeholder ratio of **100 Boost Bucks = 80 Robux per 100**, pending human tuning confirmation. This will be embedded in the constants module and is safe to ship as a tunable value — but the ratio should be validated before launch.
>
> **OQ-2 (VIP server pricing):** The spec marks VIP servers as TBD. No VIP server task has been created. If VIP servers are required, a human must update the spec and request a partial replan.

---

## Out-of-Scope Conflicts Detected

The following spec features are **explicitly out of scope for MVP** and have NOT had tasks generated for them. If any of these are re-scoped in, request a replan:

- Feature 2: Mining Production Chain — deferred post-launch
- Feature 3: Oil Production Chain — deferred post-launch
- Feature 9: Convoy Raid (Steal mechanic) — deferred post-launch
- Feature 10: Sabotage (Wrench Throw) — deferred post-launch
- Feature 11: Anti-Sabotage Defenses — deferred post-launch
- Feature 12: Cosmetics Store — deferred post-launch
- VIP servers — TBD per spec, no task created

---

## Milestones

### M1 — Infrastructure Foundation
**ID:** `industrial-tycoon-m1`
**Goal:** A player can join the server and be auto-assigned to a team, with their data schema initialised and all shared RemoteEvents available.
**Estimated nights:** 1
**Critical path:** Yes
**Status:** complete
**Completed:** 2026-04-29
**Tasks (execution order):** it-001, it-002, it-003, it-004

**Success criteria:**
1. The constants module loads without error from both server and client scripts, exposing all game-wide configuration values.
2. All RemoteEvents and RemoteFunctions are declared in ReplicatedStorage and reachable by both server and client scripts.
3. A new player joining the server receives a default data schema entry loaded from DataStore (or created fresh if first visit).
4. A player joining is auto-assigned to Team A or Team B to maintain team balance, and team assignment persists until they leave.

---

### M2 — Megamap Layout and Lumber Zone Assets
**ID:** `industrial-tycoon-m2`
**Goal:** A player can load into a mirrored megamap with both team's Lumber zones visually present and a neutral center Sell Depot zone.
**Estimated nights:** 1
**Critical path:** Yes
**Status:** complete
**Completed:** 2026-04-30
**Tasks (execution order):** it-005, it-006

**Success criteria:**
1. The megamap loads with two clearly mirrored team halves separated by a neutral center zone containing the Sell Depot building.
2. Both team halves contain Lumber zone placeholders: a tree/chopper area, a conveyor path, a Sawmill building, and a Cash Pad marker.
3. Team territory is visually distinguished by team-color accents (Team A red, Team B blue) on factory buildings and territory borders.

---

### M3 — Lumber Production Chain
**ID:** `industrial-tycoon-m3`
**Goal:** A player can click a tree or chopper machine, watch a log travel the conveyor to the Sawmill, receive a plank, and walk over the Cash Pad to earn money.
**Estimated nights:** 2
**Critical path:** Yes
**Status:** in-progress
**Tasks (execution order):** it-007, it-008, it-009, it-010

**Success criteria:**
1. Clicking a tree or chopper machine spawns a log part that immediately moves onto the conveyor system.
2. A log part that reaches the Sawmill is consumed and a plank part is spawned on the outbound conveyor.
3. A player walking over the Cash Pad when a plank part is touching it receives money in their personal wallet and their team wallet is incremented.
4. The ConveyorBelt module moves parts at a speed defined by the constants module (baseline tier-1 speed), confirming the upgrade hook is in place even before upgrades are purchasable.

---

### M4 — Team Wallets, Sell Depot, and Round Manager
**ID:** `industrial-tycoon-m4`
**Goal:** A full 15-minute round runs from start to finish, deposits at the center Sell Depot count toward the depositing team's wallet, and the winning team is declared and rewarded at round end.
**Estimated nights:** 2
**Critical path:** Yes
**Status:** in-progress
**Tasks (execution order):** it-012, it-011, it-017, it-018

**Success criteria:**
1. Both teams have independent server-side wallets that accumulate earnings; wallet totals are not shared between teams.
2. A player who deposits processed goods at the Sell Depot has the equivalent dollar value credited to their team's wallet (not their personal wallet).
3. A 15-minute countdown timer starts on the server at round start, broadcasts remaining time to all clients, and transitions state from `active` to `ended` at expiry.
4. At round end, the team with the higher Sell Depot total is declared the winner; a bonus drop event fires specifically for winning-team players.

---

### M5 — Upgrade System
**ID:** `industrial-tycoon-m5`
**Goal:** A player can spend earned money in the Upgrade Shop to buy per-machine Speed or Output upgrades that immediately affect that machine's behaviour.
**Estimated nights:** 2
**Critical path:** Yes
**Status:** in-progress
**Tasks (execution order):** it-013, it-014, it-016, it-015

**Success criteria:**
1. Each physical machine instance has an independent upgrade level tracked server-side; two choppers on the same team can be at different upgrade levels.
2. Purchasing a Speed upgrade on a specific machine causes that machine's conveyor speed or chopper rate to increase immediately and visibly.
3. The Upgrade Shop GUI opens in-game, lists available Speed and Output upgrades with their costs and current level, and submits a validated purchase request to the server.
4. A purchase is rejected with feedback if the player has insufficient funds; it is accepted and applied if funds are sufficient and the upgrade level is below the maximum defined in constants.

---

### M6 — DataStore Persistence and Real-Time Leaderboard
**ID:** `industrial-tycoon-m6`
**Goal:** Player money, upgrades, and cosmetics survive a server rejoin, and a live leaderboard shows both teams' current totals updating in real time.
**Estimated nights:** 1
**Critical path:** Yes
**Status:** pending
**Tasks (execution order):** it-019, it-020, it-021

**Success criteria:**
1. A player who earns money and buys upgrades in one session, then rejoins the server, sees their money and upgrade ownership correctly restored.
2. The real-time leaderboard ScreenGui displays both teams' current Sell Depot totals and refreshes within 2 seconds of any deposit event.
3. Leaderboard updates are pushed server-to-client via RemoteEvent (not polled on the client).

---

### M7 — Monetisation Layer
**ID:** `industrial-tycoon-m7`
**Goal:** The VIP Worker Pass auto-collector is active for pass owners, Boost Bucks can be purchased and spent on upgrades, and all purchases are protected by reliable receipt processing.
**Estimated nights:** 1
**Critical path:** No
**Status:** in-progress
**Tasks (execution order):** it-022, it-023, it-024

**Success criteria:**
1. A player who owns the VIP Worker Pass has an auto-collector NPC that follows them and automatically collects nearby Cash Pads on their behalf.
2. A player can purchase a Boost Bucks bundle via developer product; the correct amount is credited to their premium currency balance immediately.
3. MarketplaceService receipt processing handles pending receipts on rejoin, preventing lost purchases even if the server crashes mid-transaction.

---

## Task Index

| Task ID | Title | Type | Complexity | Est. Min | Milestone | Status | Depends On |
|---------|-------|------|-----------|---------|-----------|--------|------------|
| it-001 | Create constants module | config | low | 20 | m1 | done | — |
| it-002 | Declare RemoteEvents and RemoteFunctions | config | low | 20 | m1 | done | it-001 (soft) |
| it-003 | Player data schema and DataStore module | data | medium | 50 | m1 | done | it-001 (hard), it-002 (soft) |
| it-004 | Teams service auto-balance and wallet data structure | scripting | medium | 50 | m1 | done | it-001 (hard), it-002 (hard) |
| it-005 | Build megamap geometry (mirrored halves, center zone) | asset | high | 80 | m2 | done | it-001 (soft) |
| it-006 | Place Lumber zone machine assets on both team halves | asset | high | 80 | m2 | done | it-005 (hard) |
| it-007 | Implement ConveyorBelt server module | scripting | high | 80 | m3 | done | it-001 (hard) |
| it-008 | Implement ClickDetector chopper machine activation | game-mechanic | medium | 50 | m3 | done | it-006 (hard), it-007 (hard) |
| it-009 | Implement Sawmill processor script | scripting | medium | 50 | m3 | done | it-006 (hard), it-007 (hard) |
| it-010 | Implement CashPad detector | game-mechanic | medium | 50 | m3 | pending | it-006 (hard), it-009 (hard), it-012 (hard) |
| it-011 | Implement Sell Depot goods conversion server logic | scripting | medium | 50 | m4 | done | it-005 (hard), it-012 (hard) |
| it-012 | Implement team wallet server module | scripting | medium | 50 | m4 | done | it-004 (hard) |
| it-013 | Implement per-machine upgrade state server module | scripting | medium | 50 | m5 | done | it-001 (hard), it-003 (hard) |
| it-014 | Implement upgrade effect application to machines | scripting | medium | 50 | m5 | done | it-013 (hard) |
| it-015 | Create Upgrade Shop ScreenGui | ui | high | 80 | m5 | pending | it-002 (hard), it-013 (hard) |
| it-016 | Implement upgrade purchase server handler | scripting | medium | 50 | m5 | pending | it-002 (hard), it-003 (hard), it-013 (hard), it-014 (hard) |
| it-017 | Implement Round Manager server module | game-mechanic | high | 80 | m4 | pending | it-001 (hard), it-004 (hard), it-012 (hard) |
| it-018 | Implement win condition and bonus drop distribution | game-mechanic | medium | 50 | m4 | pending | it-012 (hard), it-017 (hard) |
| it-019 | Implement player data save and load via DataStoreService | data | high | 80 | m6 | pending | it-003 (hard), it-013 (hard), it-017 (hard) |
| it-020 | Implement leaderboard data publisher server script | scripting | medium | 50 | m6 | pending | it-002 (hard), it-012 (hard) |
| it-021 | Create Real-Time Team Leaderboard ScreenGui | ui | medium | 50 | m6 | pending | it-002 (hard), it-020 (hard) |
| it-022 | Implement MarketplaceService framework | scripting | medium | 50 | m7 | done | it-001 (hard), it-003 (hard) |
| it-023 | Implement VIP Worker Pass auto-collector NPC | game-mechanic | high | 80 | m7 | pending | it-010 (hard), it-022 (hard) |
| it-024 | Implement Boost Bucks developer product purchase and spending | game-mechanic | medium | 50 | m7 | pending | it-013 (hard), it-022 (hard), it-016 (soft) |

---

## Full Task Definitions

### it-001 — Create constants module
**Type:** config | **Complexity:** low | **Est. minutes:** 20 | **Milestone:** m1 | **Assignee:** builder | **Status:** done

Create a shared `Constants` ModuleScript in `ReplicatedStorage` (readable by both server and client). Must define: round duration (default 900 seconds), team names ("Team A", "Team B"), team colors (BrickColor values), all upgrade tier limits and cost tables per machine type, conveyor baseline speed per tier, Boost Bucks product IDs (placeholder), game pass IDs (placeholder), DataStore key names, and a DEBUG_MODE boolean. All magic numbers in any other script must reference this module.

**depends_on:** none

---

### it-002 — Declare RemoteEvents and RemoteFunctions
**Type:** config | **Complexity:** low | **Est. minutes:** 20 | **Milestone:** m1 | **Assignee:** builder | **Status:** done

Create a `RemoteEvents` folder and `RemoteFunctions` folder in `ReplicatedStorage`. Declare the following named instances:
- RemoteEvents: `MoneyUpdated`, `TeamWalletUpdated`, `RoundStateChanged`, `RoundTimerTick`, `UpgradePurchased`, `LeaderboardUpdated`, `SellDepotDeposited`, `BonusDropFired`, `BoostBucksUpdated`
- RemoteFunctions: `RequestUpgradePurchase`, `GetPlayerData`

Script must not contain logic — it is a pure declaration script (runs once on startup and does nothing else).

**depends_on:** `it-001` (soft — uses constant names for folder structure reference)

---

### it-003 — Player data schema and DataStore module
**Type:** data | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m1 | **Assignee:** builder | **Status:** done

Create a `PlayerDataService` ModuleScript in `ServerScriptService`. Responsibilities:
- Define the canonical player data schema: `{ money: number, boostBucks: number, upgradesPurchased: { [machineId: string]: number }, cosmeticsOwned: { [id: string]: boolean } }`.
- On player join: attempt DataStore load with retry (max 3 attempts, `task.wait(2)` between attempts). If load fails, use defaults and log a warning.
- Expose `GetData(player)`, `SetMoney(player, amount)`, `AddMoney(player, delta)`, `GetUpgradeLevel(player, machineId)`, `SetUpgradeLevel(player, machineId, level)`, `AddBoostBucks(player, amount)`, `SpendBoostBucks(player, amount)`.
- DataStore key format: `Player_{userId}`.
- Do NOT auto-save on every update — save is triggered explicitly by Round Manager (it-017) and on player leave.

**depends_on:** `it-001` (hard — uses DataStore key format and schema constants)

---

### it-004 — Teams service auto-balance and wallet data structure
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m1 | **Assignee:** builder | **Status:** done

Create a `TeamService` ModuleScript in `ServerScriptService`. Responsibilities:
- On player join: assign to the team with fewer players (Team A or Team B). If equal, assign to Team A.
- Maintain an in-memory table `TeamWallets: { ["Team A"]: number, ["Team B"]: number }` initialised to 0 at round start.
- Expose `GetTeamWallet(teamName)`, `AddToTeamWallet(teamName, amount)`, `ResetWallets()`, `GetWinningTeam()` (returns team name with higher wallet, or nil on tie).
- On player character spawn: assign the correct `Teams` service `Team` object to the player.
- Use `game:GetService("Teams")` — never `game.Teams`.

**depends_on:** `it-001` (hard — uses team name constants), `it-002` (hard — fires `TeamWalletUpdated` remote when wallet changes)

---

### it-005 — Build megamap geometry (mirrored halves, center zone)
**Type:** asset | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m2 | **Assignee:** builder | **Status:** done

In Roblox Studio, construct the megamap `Workspace` layout:
- Total map size: approximately 1200×1200 studs, flat terrain base.
- Split symmetrically: Team A occupies the left half (x < 0), Team B occupies the right half (x > 0), with a 100-stud-wide neutral center strip.
- Each team half contains three labeled zones: `LumberZone`, `MineZone` (placeholder only — no machines), `OilZone` (placeholder only — no machines).
- Center strip contains a `SellDepot` building (a large warehouse structure with clear entrance walkways from both sides).
- A visible boundary wall or color-coded ground plane separates the team halves.
- All geometry organized in `Workspace > Map > TeamA`, `Workspace > Map > TeamB`, `Workspace > Map > Center`.
- Team A half uses red accent color; Team B uses blue accent color on factory buildings and territory borders.

**ambiguity_notes:** Exact stud dimensions for each zone are not specified in the spec. Architect assumes approximately 500×1200 studs per team half, 100×1200 studs for the center strip. Builder should adjust during implementation based on playability, and log the final dimensions in progress.md.

**depends_on:** `it-001` (soft — uses team color constants for material/color application)

---

### it-006 — Place Lumber zone machine assets on both team halves
**Type:** asset | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m2 | **Assignee:** builder | **Status:** pending

Within each team's `LumberZone` (established in it-005), place the following physical instances in Studio:
- One Tree model (a stackable log source) with a `ClickDetector` child.
- One Auto-Chopper machine model (placeholder blocky asset, labeled `AutoChopper`) adjacent to the tree, with `ClickDetector` child.
- One straight Conveyor path (series of `ConveyorSegment` Parts forming an L-shaped or straight run from chopper to Sawmill, minimum 5 segments per run).
- One Sawmill building model (labeled `Sawmill`), with a `LogInput` region Part and a `PlankOutput` Part.
- One `CashPad` Part (a glowing floor plate, labeled `CashPad`) near the Sawmill output.
- All machine models grouped under `Workspace > Map > TeamA > LumberZone > Machines` (and equivalent TeamB path).
- Mirror positions symmetrically for Team B (mirror across x=0 axis).

**depends_on:** `it-005` (hard — zones must exist before machine placement)

---

### it-007 — Implement ConveyorBelt server module
**Type:** scripting | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m3 | **Assignee:** builder | **Status:** pending

Create `ConveyorBelt` ModuleScript in `ServerScriptService`. This module is the authoritative physics driver for all conveyor movement in the game.

Implementation approach (documented decision — see decisions.md): physical `BasePart` instances representing resources are moved server-side using `CFrame` updates at each `RunService.Heartbeat`. This ensures resource positions are authoritative on the server, which is required for steal mechanics (post-launch) and consistent CashPad detection.

Expose:
- `ConveyorBelt.new(segmentParts: {BasePart}, speed: number): ConveyorBeltInstance` — creates a controller for a chain of conveyor segment Parts.
- `ConveyorBeltInstance:AddPart(part: BasePart)` — registers a resource part to be moved along this conveyor.
- `ConveyorBeltInstance:SetSpeed(speed: number)` — updates movement speed (called by upgrade system).
- `ConveyorBeltInstance:RemovePart(part: BasePart)` — deregisters a part (called when part reaches destination or is collected).

Internal: each Heartbeat, move each registered part forward along the waypoint chain at `speed` studs/second. When a part reaches the end waypoint, fire a callback registered by the caller (e.g. Sawmill listens for log arrival).

**depends_on:** `it-001` (hard — reads baseline conveyor speed from constants)

---

### it-008 — Implement ClickDetector chopper machine activation
**Type:** game-mechanic | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m3 | **Assignee:** builder | **Status:** pending

Create a `ChopperService` Script in `ServerScriptService`. For each `AutoChopper` instance found under any team's `LumberZone > Machines`:
- Attach a `ClickDetector` listener on the server.
- On click by a player: validate the clicking player is on the correct team for this machine (server-side check — never trust client). If valid, spawn a log `Part` at the chopper's output point and register it with `ConveyorBelt:AddPart()` for the corresponding conveyor.
- Enforce a per-player click cooldown (defined in constants, default 0.5 seconds) using `task.wait()`.
- Each log Part must be tagged with an attribute `ResourceType = "Log"` and `OwnerTeam = teamName`.
- Do not use `spawn()` or `delay()` — use `task.spawn()`.

**depends_on:** `it-006` (hard — machine instances must exist in Workspace), `it-007` (hard — calls ConveyorBelt:AddPart)

---

### it-009 — Implement Sawmill processor script
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m3 | **Assignee:** builder | **Status:** pending

Create a `SawmillService` Script in `ServerScriptService`. For each `Sawmill` instance found under any team's `LumberZone > Machines`:
- Register a callback with the ConveyorBelt module for when a part tagged `ResourceType = "Log"` reaches the `LogInput` region of this Sawmill.
- On log arrival: destroy the log Part; after a processing delay (defined in constants, default 2 seconds using `task.wait()`), spawn a `Plank` Part at the `PlankOutput` point and register it with the outbound ConveyorBelt segment.
- Output Plank Part must have attribute `ResourceType = "Plank"` and inherit `OwnerTeam` from the input log.
- One log in → one plank out at base level; upgrade system will modify the output rate multiplier via the upgrade effect module (it-014).
- Multiple logs queued at the LogInput region are processed one at a time (FIFO).

**depends_on:** `it-006` (hard — Sawmill instances must exist), `it-007` (hard — uses ConveyorBelt callbacks)

---

### it-010 — Implement CashPad detector
**Type:** game-mechanic | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m3 | **Assignee:** builder | **Status:** pending

Create a `CashPadService` Script in `ServerScriptService`. For each `CashPad` Part found under any team's `LumberZone > Machines`:
- Connect a `Touched` event on the server.
- On touch:
  - If the touching instance has attribute `ResourceType` (i.e. it is a resource part — Plank), and its `OwnerTeam` attribute matches the team that owns this CashPad:
    - Calculate the dollar value (defined in constants per resource type, e.g. Plank = $10 base).
    - Call `PlayerDataService:AddMoney(player, amount)` for the nearest player within 10 studs of the CashPad.
    - Call `TeamService:AddToTeamWallet(teamName, amount)`.
    - Fire `MoneyUpdated` remote to the credited player.
    - Destroy the Plank Part.
  - If the touching instance is a player's `HumanoidRootPart` and there are Plank Parts currently resting on the CashPad surface: same logic as above, triggered by player presence rather than part touch (handles the "walk over" mechanic).
- Server validates all touches — never trust a client-fired event for money.

**ambiguity_notes:** The spec says players walk over the cash pad to collect goods. The exact interaction (player touch triggers collection, or resource part arriving triggers collection, or both?) is not fully specified. Architect interpretation: both triggers fire — a resource arriving at the pad is collected when a player is already standing on it, OR a player walking onto the pad collects all resources already there. Builder should implement both and log in progress.md.

**depends_on:** `it-006` (hard — CashPad Parts must exist), `it-009` (hard — planks must be arriving from Sawmill), `it-012` (hard — calls TeamService:AddToTeamWallet)

---

### it-011 — Implement Sell Depot goods conversion server logic
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m4 | **Assignee:** builder | **Status:** pending

Create a `SellDepotService` Script in `ServerScriptService`. For the `SellDepot` building in the center zone:
- Define a `DepositZone` Region3 or touch-sensitive Part at the entrance of the Sell Depot.
- When a player carrying resource parts (tracked server-side as `ResourceType` attribute on parts near the player) enters the DepositZone, OR when a resource part tagged with `OwnerTeam` arrives at the depot (via conveyor if connected later):
  - Convert each resource part to its dollar value (per constants).
  - Call `TeamService:AddToTeamWallet(ownerTeam, value)`.
  - Fire `SellDepotDeposited` remote to all clients on the depositing team.
  - Fire `LeaderboardUpdated` to trigger leaderboard refresh.
  - Destroy the resource part.
- Server-side only — no client can trigger a deposit.

**ambiguity_notes:** The spec describes goods being deposited at the "Sell Depot" for team wallet credit, but also describes Cash Pads near output points as the collection mechanism. It is ambiguous whether Cash Pads near machines ARE the Sell Depot, or whether there is a separate central Sell Depot building where goods must be physically carried. Architect interpretation: Cash Pads near machines credit the personal wallet only; the central Sell Depot credits the team wallet. Builder should confirm with the physical map layout and log the decision.

**depends_on:** `it-005` (hard — SellDepot building must exist in Workspace), `it-012` (hard — calls TeamService:AddToTeamWallet)

---

### it-012 — Implement team wallet server module
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m4 | **Assignee:** builder | **Status:** pending

Implement the `TeamService` module's wallet functionality (this task implements the wallet side of the module declared in it-004; it-004 covers team assignment and data structure initialization, it-012 covers runtime wallet operations).

Ensure `TeamService` exposes:
- `AddToTeamWallet(teamName: string, amount: number)` — atomically increments the in-memory wallet, then fires `TeamWalletUpdated` remote to all players.
- `GetTeamWallet(teamName: string): number` — returns current wallet total.
- `ResetWallets()` — zeros both wallets (called by Round Manager at round start).
- `GetWinningTeam(): string?` — returns team name with strictly higher wallet, or `nil` on tie.

Thread safety: if multiple CashPad events fire simultaneously, wallet increments must not race. Use a single-threaded update via the Roblox task scheduler (Lua is single-threaded; no mutex needed, but updates should not yield mid-increment).

**depends_on:** `it-004` (hard — extends the TeamService module created in it-004)

---

### it-013 — Implement per-machine upgrade state server module
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m5 | **Assignee:** builder | **Status:** pending

Create `UpgradeStateService` ModuleScript in `ServerScriptService`. Manages in-round, per-machine upgrade levels.

- In-memory store: `{ [machineId: string]: { speedLevel: number, outputLevel: number } }` where `machineId` is the full Workspace path string of the machine model (e.g. `"Map.TeamA.LumberZone.Machines.AutoChopper"`).
- Expose: `GetUpgradeLevel(machineId, upgradeType)`, `SetUpgradeLevel(machineId, upgradeType, level)`, `GetAllUpgrades(): table`, `ResetAllUpgrades()` (called at round start).
- Per-machine, not per-player — all team members share the same machine.
- Upgrade levels persist for the duration of the round, then reset (upgrades are round-scoped, not cross-session). Player DataStore (it-003) records which upgrades were purchased for cosmetic/history purposes only.
- Max level per upgrade type is defined in constants (it-001).

**depends_on:** `it-001` (hard — reads max level constants), `it-003` (hard — writes upgrade purchase record to player data schema)

---

### it-014 — Implement upgrade effect application to machines
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m5 | **Assignee:** builder | **Status:** pending

Create `UpgradeEffectService` ModuleScript in `ServerScriptService`. Translates upgrade level integers into runtime stat changes.

- `ApplySpeedUpgrade(machineId: string, level: number)`: calls `ConveyorBelt:SetSpeed(baseSpeed * speedMultiplier[level])` on the conveyor associated with the machine.
- `ApplyOutputUpgrade(machineId: string, level: number)`: sets an attribute `OutputMultiplier` on the Sawmill (or other processor) model. The processor's spawn logic reads this attribute to determine how many output parts to spawn per input.
- Speed multipliers and output multipliers per level are defined in constants (it-001) as tables.
- Called by upgrade purchase handler (it-016) after each successful purchase.

**depends_on:** `it-013` (hard — reads upgrade levels to determine what to apply)

---

### it-015 — Create Upgrade Shop ScreenGui
**Type:** ui | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m5 | **Assignee:** builder | **Status:** pending

Create a `UpgradeShopGui` ScreenGui in `StarterGui`. Implemented as a LocalScript (`UpgradeShopController`) in `StarterPlayerScripts`.

Layout:
- Toggle button (wrench icon or "SHOP" label) in bottom-right corner that opens/closes the main panel.
- Main panel: vertical list of upgrade cards, one per machine the player's team owns. Each card shows: machine name, current Speed level (e.g. "Speed: 2/5"), current Output level (e.g. "Output: 1/5"), buy buttons for each upgrade type with cost displayed.
- Currency display at top of panel showing player's current money and Boost Bucks balance.
- Visual feedback: button greyed out if player cannot afford; green flash on successful purchase.

Behavior:
- On open: fire `GetPlayerData` RemoteFunction to fetch current money and upgrade levels.
- On buy press: fire `RequestUpgradePurchase` RemoteFunction with `{ machineId, upgradeType }`.
- On response: update displayed levels and currency. Show error text if rejected.
- Never modify server state directly — all state changes go through the RemoteFunction.

**depends_on:** `it-002` (hard — uses RemoteEvents/RemoteFunctions declared there), `it-013` (hard — displays upgrade levels)

---

### it-016 — Implement upgrade purchase server handler
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m5 | **Assignee:** builder | **Status:** pending

Implement the server side of the `RequestUpgradePurchase` RemoteFunction. This is the sole authoritative purchase path — no client-side state mutation.

Validation chain (all server-side):
1. Confirm the requesting player is on the team that owns the requested `machineId`.
2. Confirm the current upgrade level is below the max (from constants).
3. Confirm the player has sufficient money (`PlayerDataService:GetData(player).money >= cost`).
4. If all checks pass: deduct cost from player money (`PlayerDataService:AddMoney(player, -cost)`), call `UpgradeStateService:SetUpgradeLevel(machineId, upgradeType, newLevel)`, call `UpgradeEffectService:Apply{Speed|Output}Upgrade(machineId, newLevel)`, fire `UpgradePurchased` RemoteEvent to all clients on the team, return `{ success = true, newLevel = newLevel }`.
5. If any check fails: return `{ success = false, reason = "..." }` — do not throw an error.

**depends_on:** `it-002` (hard — handles the RemoteFunction declared there), `it-003` (hard — reads and updates player money), `it-013` (hard — reads/sets upgrade state), `it-014` (hard — calls upgrade effect applicator)

---

### it-017 — Implement Round Manager server module
**Type:** game-mechanic | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m4 | **Assignee:** builder | **Status:** pending

Create `RoundManager` Script in `ServerScriptService`. Controls the game's round lifecycle.

States: `waiting` → `active` → `ended` → `waiting` (loop).

Waiting phase:
- Wait until minimum player count (defined in constants, default 2) is reached.
- Broadcast `RoundStateChanged` with `{ state = "waiting", secondsUntilStart = N }`.

Active phase:
- Call `TeamService:ResetWallets()`, `UpgradeStateService:ResetAllUpgrades()`.
- Start countdown: every second, fire `RoundTimerTick` to all clients with seconds remaining.
- Use a loop with `task.wait(1)`.

Ended phase:
- Fire `RoundStateChanged` with `{ state = "ended" }`.
- Call `TeamService:GetWinningTeam()` to determine winner.
- Call DataStore save for all players (via `PlayerDataService`).
- Wait `intermissionDuration` seconds (from constants, default 15) then transition back to waiting.

**depends_on:** `it-001` (hard — reads round duration, intermission duration, min player count), `it-004` (hard — team assignments drive wallet resets), `it-012` (hard — calls ResetWallets and GetWinningTeam)

---

### it-018 — Implement win condition and bonus drop distribution
**Type:** game-mechanic | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m4 | **Assignee:** builder | **Status:** pending

Extend the Round Manager's ended phase (or a separate `WinHandler` module called by Round Manager):
- Retrieve winning team name from `TeamService:GetWinningTeam()`.
- If a winner exists (no tie): fire `BonusDropFired` RemoteEvent to all players on the winning team with payload `{ rewardType = "cosmetic_ticket", amount = 1 }`. (The cosmetics system is post-launch; the ticket is stored in player data and redeemed later.)
- If tie: fire `BonusDropFired` to nobody (no reward).
- Broadcast `RoundStateChanged` with `{ state = "ended", winnerTeam = teamName, isTie = boolean }` to all clients.
- Log the round result (winner, wallet totals) to a `DataStoreService` ordered datastore (`RoundHistory`) for future analytics. This is a best-effort write — do not block round reset on failure.

**ambiguity_notes:** The spec says winners receive "a rare cosmetic + bonus currency" but the cosmetics store is out of scope at MVP. Architect assumption: the bonus drop grants a `cosmetic_ticket` stored in player data. When the cosmetics store launches post-MVP, these tickets will be redeemable. Builder must store the ticket count in the player data schema.

**depends_on:** `it-012` (hard — calls GetWinningTeam), `it-017` (hard — triggered by round end state transition)

---

### it-019 — Implement player data save and load via DataStoreService
**Type:** data | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m6 | **Assignee:** builder | **Status:** pending

Implement the full save and load flow in `PlayerDataService` (it-003 defines the schema; this task implements the actual DataStore calls):

Load (on player join):
- `DataStoreService:GetDataStore("PlayerData"):GetAsync("Player_" .. userId)` with retry logic (3 attempts, 2-second backoff via `task.wait(2)`).
- If nil (new player): write default schema.
- Merge loaded data with current schema defaults to handle new fields added after a player last played (forward-compatibility).

Save (triggered explicitly — NOT on every data change):
- Save triggers: player leaving (`Players.PlayerRemoving`), round end (`RoundManager` calls a save hook), and a periodic auto-save every 5 minutes (safety net using `task.wait(300)` loop).
- Use `:UpdateAsync()` to prevent race conditions from two servers writing the same key.
- On save failure: log the error via a `DEBUG_MODE`-guarded warn, do not crash.

**depends_on:** `it-003` (hard — uses schema defined there), `it-013` (hard — includes upgrade purchase history in saved data), `it-017` (hard — receives save trigger from Round Manager at round end)

---

### it-020 — Implement leaderboard data publisher server script
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m6 | **Assignee:** builder | **Status:** pending

Create a `LeaderboardPublisher` Script in `ServerScriptService`. Responsible for broadcasting team wallet totals to all clients whenever they change.

- Listen for `SellDepotDeposited` and `TeamWalletUpdated` events (server-side `BindableEvent` or direct function call from `TeamService`).
- On each event: fire `LeaderboardUpdated` RemoteEvent to all players with payload `{ teamA: number, teamB: number }`.
- Also fire on round state changes (`RoundStateChanged`) so the leaderboard resets to 0 at round start.
- Do not poll — event-driven only.

**depends_on:** `it-002` (hard — fires `LeaderboardUpdated` RemoteEvent declared there), `it-012` (hard — reads team wallet totals from TeamService)

---

### it-021 — Create Real-Time Team Leaderboard ScreenGui
**Type:** ui | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m6 | **Assignee:** builder | **Status:** pending

Create a `LeaderboardGui` ScreenGui in `StarterGui`. Implemented as a LocalScript (`LeaderboardController`) in `StarterPlayerScripts`.

Layout:
- Persistent top-center HUD element (always visible, not toggleable).
- Two columns, one per team: Team A (red) on the left, Team B (blue) on the right.
- Each column shows: team name, team color icon, and current Sell Depot total in formatted currency (e.g. "$12,400").
- Round timer displayed centered between the two columns (receives `RoundTimerTick` events).
- Round state label below timer (e.g. "ROUND IN PROGRESS", "WAITING FOR PLAYERS", "TEAM A WINS!").

Behavior:
- On `LeaderboardUpdated` event: tween the displayed numbers from old to new value over 0.3 seconds (visual polish).
- On `RoundStateChanged` event: update state label and reset totals to $0 if state is `waiting`.
- On `RoundTimerTick` event: update timer display.
- Never reads game state directly — all data comes from RemoteEvents.

**depends_on:** `it-002` (hard — listens to RemoteEvents declared there), `it-020` (hard — depends on publisher existing to send events)

---

### it-022 — Implement MarketplaceService framework
**Type:** scripting | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m7 | **Assignee:** builder | **Status:** pending

Create `MarketplaceService` integration module `MonetisationService` in `ServerScriptService`.

- Use `game:GetService("MarketplaceService")`.
- Implement `ProcessReceipt` callback (required by Roblox for developer products). Must:
  - Identify the product by `productId` (from constants).
  - Route to the appropriate handler (Boost Bucks, etc.).
  - Return `Enum.ProductPurchaseDecision.PurchaseGranted` on success, `NotProcessedYet` on failure.
  - Mark receipt as processed in DataStore to prevent double-granting on rejoin.
- Implement `UserOwnsGamePassAsync(userId, passId)` wrapper with pcall error handling.
- Expose: `CheckGamePass(player, passId): boolean`, `HandleDevProduct(player, productId)`.
- Game pass IDs and dev product IDs are read from constants (it-001).

**depends_on:** `it-001` (hard — reads product/pass IDs from constants), `it-003` (hard — writes to player data on purchase grant)

---

### it-023 — Implement VIP Worker Pass auto-collector NPC
**Type:** game-mechanic | **Complexity:** high | **Est. minutes:** 80 | **Milestone:** m7 | **Assignee:** builder | **Status:** pending

Create `VIPWorkerService` Script in `ServerScriptService`. For each player who owns the VIP Worker Pass:
- On spawn (and after `MonetisationService:CheckGamePass` confirms ownership): spawn a simple NPC model near the player.
- NPC behavior loop (server-side, using `task.spawn`):
  - Poll for nearby `CashPad` Parts within 15 studs that have resource parts on them (tagged `ResourceType`).
  - Use `Humanoid:MoveTo()` to walk the NPC to the nearest CashPad.
  - On arrival (within 3 studs): trigger the same cash collection logic as a player walk-over (call `CashPadService` collect function directly — do NOT fire a client event).
  - Repeat every 2 seconds.
- If the player leaves, destroy their NPC.
- NPC is named `"[PlayerName]'s Worker"` and uses a visually distinct character (foreman outfit if available as a Roblox default avatar).

**depends_on:** `it-010` (hard — calls CashPad collection logic), `it-022` (hard — checks game pass ownership via MonetisationService)

---

### it-024 — Implement Boost Bucks developer product purchase and spending
**Type:** game-mechanic | **Complexity:** medium | **Est. minutes:** 50 | **Milestone:** m7 | **Assignee:** builder | **Status:** pending

Extend `MonetisationService` (it-022) to handle Boost Bucks developer product purchases:
- On `ProcessReceipt` for a Boost Bucks product ID: call `PlayerDataService:AddBoostBucks(player, amount)` where amount is determined by product tier (defined in constants).
- Fire `BoostBucksUpdated` RemoteEvent to the purchasing player.

Extend `UpgradeShopGui` (it-015) to show Boost Bucks balance and allow spending:
- Add a "Pay with Boost Bucks" secondary button on each upgrade card.
- On press: fire `RequestUpgradePurchase` with `{ machineId, upgradeType, payWithBoostBucks = true }`.
- Server handler in it-016 must be extended: if `payWithBoostBucks = true`, deduct from `boostBucks` balance instead of `money`. All other validation is identical.

**ambiguity_notes (OQ-2):** Boost Bucks conversion rate (Robux → in-game currency) is an open question. Architect assumption: use a placeholder ratio defined in constants (default: 1 Boost Buck costs ~0.80 Robux at the cheapest bundle tier). This is tunable without code changes. Builder must document the placeholder value in progress.md and mark it for human review before launch.

**depends_on:** `it-013` (hard — spends Boost Bucks to set upgrade levels), `it-022` (hard — purchase flow goes through MonetisationService), `it-016` (soft — extends the purchase handler built there)

---

## Dependency Summary

### Critical chain
`it-001` → `it-004` → `it-012` → `it-017` → `it-018`  
(Round system chain: constants → teams → wallets → round manager → win condition)

`it-001` → `it-007` → `it-008` → *(it-010 also needs it-012)*  
(Lumber loop chain: constants → conveyor → chopper → cashpad)

`it-001` → `it-003` → `it-013` → `it-014` → `it-016`  
(Upgrade chain: constants → data schema → upgrade state → effects → purchase handler)

Longest hard-dependency chain (9 hops):  
`it-001` → `it-003` → `it-013` → `it-014` → `it-016` → *(it-015 depends on it-013; it-019 depends on it-013)* → `it-019` → *(it-022 depends on it-003)* → `it-022` → `it-023`

### Task dependency table

| Task ID | Title | Hard depends on | Soft depends on |
|---------|-------|----------------|----------------|
| it-001 | Create constants module | — | — |
| it-002 | Declare RemoteEvents/RemoteFunctions | — | it-001 |
| it-003 | Player data schema and DataStore module | it-001 | it-002 |
| it-004 | Teams service auto-balance and wallet data | it-001, it-002 | — |
| it-005 | Build megamap geometry | — | it-001 |
| it-006 | Place Lumber zone machine assets | it-005 | — |
| it-007 | Implement ConveyorBelt server module | it-001 | — |
| it-008 | Implement ClickDetector chopper activation | it-006, it-007 | — |
| it-009 | Implement Sawmill processor script | it-006, it-007 | — |
| it-010 | Implement CashPad detector | it-006, it-009, it-012 | — |
| it-011 | Implement Sell Depot server logic | it-005, it-012 | — |
| it-012 | Implement team wallet server module | it-004 | — |
| it-013 | Per-machine upgrade state server module | it-001, it-003 | — |
| it-014 | Upgrade effect application | it-013 | — |
| it-015 | Create Upgrade Shop ScreenGui | it-002, it-013 | — |
| it-016 | Upgrade purchase server handler | it-002, it-003, it-013, it-014 | — |
| it-017 | Implement Round Manager | it-001, it-004, it-012 | — |
| it-018 | Win condition and bonus drop | it-012, it-017 | — |
| it-019 | Player data save and load | it-003, it-013, it-017 | — |
| it-020 | Leaderboard data publisher | it-002, it-012 | — |
| it-021 | Real-Time Leaderboard ScreenGui | it-002, it-020 | — |
| it-022 | MarketplaceService framework | it-001, it-003 | — |
| it-023 | VIP Worker Pass auto-collector NPC | it-010, it-022 | — |
| it-024 | Boost Bucks purchase and spending | it-013, it-022 | it-016 |

### Independent tasks (can start on night 1)
- `it-001`: Create constants module — no dependencies, must be first
- `it-005`: Build megamap geometry — asset work, only a soft dep on it-001

### Blocked tasks
None. All open questions (Boost Bucks conversion rate, VIP server pricing) have been resolved with documented assumptions that are tunable via constants. No task is blocked at plan creation.

---

## Changelog

| Date | Event | Author |
|------|-------|--------|
| 2026-04-29 | Initial plan created from spec `specs/industrial-tycoon/spec.md`. 24 tasks across 7 milestones. Mining, Oil, Sabotage, Steal, Anti-Sabotage, and Cosmetics Store deferred per spec out-of-scope list. | Architect |
| 2026-04-29 | M1 complete (it-001 through it-004 done). it-005 (first M2 task) completed in same sprint. Active milestone advanced to M2. Task statuses updated. | Planner |
| 2026-04-30 | M2 complete (it-006 done). M3 in-progress (it-007, it-008, it-009 done). M4 in-progress (it-011, it-012 done). M5 in-progress (it-013, it-014 done). M7 in-progress (it-022 done). Active milestone advanced to M3. Stale PR #14 (it-012) still open — code included in main via PR #11 (it-004). | Planner |
