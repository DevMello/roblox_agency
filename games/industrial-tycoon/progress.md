# Build Log — Industrial Megamap Tycoon

Append-only. Builder adds one entry per completed task. Never edit previous entries.

---

## 2026-05-01 — it-019: Implement player data save and load via DataStoreService
PR: #34 (https://github.com/DevMello/roblox_agency/pull/34)
Status: done
Notes: PlayerDataService ModuleScript at ServerScriptService.PlayerDataService extended with
  full DataStore save/load. SavePlayer uses UpdateAsync with 3-attempt, 2s-backoff retry loop.
  SaveAllPlayers() iterates Players:GetPlayers() and task.spawns each save concurrently.
  PlayerRemoving now calls SavePlayer before clearing the cache entry.
  Periodic auto-save task.spawn loop fires every 300 seconds (task.wait(300)).
  RoundManager (it-017) calls SaveAllPlayers() at round end via the same API.
  Load path (on PlayerAdded) unchanged from it-003: 3 retries, mergeWithDefaults schema forward-compat.
  All DataStore calls pcall-wrapped; failures warn() but do not crash.

---

## 2026-04-30 — it-015: Create Upgrade Shop ScreenGui
PR: #27 (https://github.com/DevMello/roblox_agency/pull/27)
Status: done
Notes: UpgradeShopController LocalScript at StarterPlayerScripts.UpgradeShopController.
  Builds UpgradeShopGui ScreenGui programmatically — toggle button bottom-right, panel with
  currency bar (money + Boost Bucks) and upgrade cards for AutoChopper and Sawmill.
  Each card: Speed N/5, Output N/5, two buy buttons (grey if unaffordable, green flash on
  success, red on rejection). On open fires GetPlayerData RF; on buy fires RequestUpgradePurchase RF.
  Live updates via UpgradePurchased and MoneyUpdated RemoteEvent listeners.
  DataHandler Script at ServerScriptService.DataHandler wires GetPlayerData.OnServerInvoke.
  Both scripts created in Studio via execute_luau.

---

## 2026-04-30 — it-016: Implement upgrade purchase server handler
PR: #26 (https://github.com/DevMello/roblox_agency/pull/26)
Status: done
Notes: UpgradePurchaseHandler Script at ServerScriptService.UpgradePurchaseHandler.
  Handles RequestUpgradePurchase RemoteFunction. Validation chain: arg type check,
  team ownership match (machineId path vs player.Team), level-cap check, cost lookup,
  funds check. On pass: AddMoney(-cost), SetUpgradeLevel, RecordPurchase, Apply{Speed|Output}Upgrade,
  FireClient UpgradePurchased to all team members. On fail: { success=false, reason=... }.
  Full pcall wrapper prevents server errors reaching client.

---

## 2026-04-30 — it-010: Implement CashPad detector
PR: #25 (https://github.com/DevMello/roblox_agency/pull/25)
Status: done
Notes: CashPadService Script at ServerScriptService.CashPadService.
  Resource part collection uses OnPartArrived on outbound belt (both plank and CashPad
  are CanCollide=false so Touched won't fire between them). Anchors arriving planks at pad
  position; collects immediately if player within CASHPAD_COLLECT_RADIUS. Player walk-over
  via Touched (fires because HumanoidRootPart has CanCollide=true). CollectFromPad(pad,player)
  exposed for VIP Worker NPC (it-023). 1-second startup delay, 2-second retry for outbound belt.

---

## 2026-04-30 — it-017: Implement Round Manager server module
PR: #24 (https://github.com/DevMello/roblox_agency/pull/24)
Status: done
Notes: RoundManager Script at ServerScriptService.RoundManager. Three-state loop:
  waiting (polls #Players:GetPlayers() < MIN_PLAYER_COUNT each second, fires RoundStateChanged),
  active (ResetWallets + ResetAllUpgrades, ROUND_DURATION countdown with RoundTimerTick each second),
  ended (GetWinningTeam → RoundStateChanged with winnerTeam/isTie, saveAllPlayers, INTERMISSION_DURATION wait).
  All timing via task.wait(). PCalled saveAllPlayers uses task.spawn per player.
  Also added PlayerDataService.SavePlayer(player) — basic UpdateAsync with pcall guard.
  Full retry logic, periodic auto-save, and PlayerRemoving hook deferred to it-019.

---

## 2026-04-30 — it-teams: Create Team A and Team B objects in Roblox Teams service
PR: #18 (https://github.com/DevMello/roblox_agency/pull/18)
Status: done
Notes: Teams already existed in Studio but with swapped colors (Team A was Bright blue,
  Team B was Bright red). Corrected to match Constants.TEAM_COLORS: Team A = Bright red,
  Team B = Bright blue. AutoAssignable set to false — TeamService owns player assignment.
  Setup script at games/industrial-tycoon/src/Setup/teams-setup.lua.
  Addresses morning report action item from 2026-04-30.

---

## 2026-04-30 — it-022: Implement MarketplaceService framework
PR: #23 (https://github.com/DevMello/roblox_agency/pull/23)
Status: done
Notes: MonetisationService ModuleScript at ServerScriptService.MonetisationService.
  ProcessReceipt: idempotent via in-memory session cache + ProcessedReceipts DataStore
  (best-effort async persistence). Routes Boost Bucks product IDs from Constants.BOOST_BUCKS_PRODUCT_IDS;
  fires BoostBucksUpdated RemoteEvent after grant. Returns NotProcessedYet if player offline
  (Roblox retries on rejoin). CheckGamePass: pcall-wrapped UserOwnsGamePassAsync; returns
  false for placeholder passId=0. HandleDevProduct: explicit server-side grant path.
  IMPORTANT: BOOST_BUCKS_PRODUCT_IDS, BOOST_BUCKS_AMOUNTS, and VIP_PASS_ID in Constants
  are all placeholder-zeroed. Human must populate these before launch.
  Source at games/industrial-tycoon/src/ServerScriptService/MonetisationService.lua.

---

## 2026-04-30 — it-014: Implement upgrade effect application to machines
PR: #22 (https://github.com/DevMello/roblox_agency/pull/22)
Status: done
Notes: UpgradeEffectService ModuleScript at ServerScriptService.UpgradeEffectService.
  ApplySpeedUpgrade: extracts team folder name from machineId path string, retrieves belt
  from BeltRegistry, calls belt:SetSpeed(CONVEYOR_BASE_SPEED[1] * SPEED_MULTIPLIER[level]).
  ApplyOutputUpgrade: finds Sawmill Part in Workspace, sets OutputMultiplier attribute;
  SawmillService will read this to control planks-per-log (requires future SawmillService
  update to respect the attribute).
  Source at games/industrial-tycoon/src/ServerScriptService/UpgradeEffectService.lua.

---

## 2026-04-30 — it-011: Implement Sell Depot goods conversion server logic
PR: #21 (https://github.com/DevMello/roblox_agency/pull/21)
Status: done
Notes: SellDepotService Script at ServerScriptService.SellDepotService. Wires Touched on
  DepositZone (workspace.Map.Center.SellDepot.DepositZone). Validates ResourceType and
  OwnerTeam attributes on touching Part. Converts folder name (TeamA/TeamB) to team display
  name via lookup table. Calls TeamService:AddToTeamWallet then fires SellDepotDeposited
  and LeaderboardUpdated RemoteEvents. Destruction before wallet credit (part gone before
  any re-fire). Server-side only.
  Source at games/industrial-tycoon/src/ServerScriptService/SellDepotService.lua.

---

## 2026-04-30 — it-009: Implement Sawmill processor script
PR: #20 (https://github.com/DevMello/roblox_agency/pull/20)
Status: done
Notes: SawmillService Script at ServerScriptService.SawmillService. FIFO log queue
  per team; processes one log at a time via task.spawn loop with SAWMILL_PROCESS_TIME (2s)
  delay. Spawns Plank (ResourceType=Plank, OwnerTeam) at PlankOutput; adds to outbound
  2-waypoint ConveyorBelt (PlankOutput→CashPad).
  Also created BeltRegistry ModuleScript (ServerScriptService.BeltRegistry) — shared
  registry for ConveyorBelt instances. ChopperService updated to register inbound belts
  there; SawmillService registers outbound belts under "<team>_outbound" key.
  Source at games/industrial-tycoon/src/ServerScriptService/SawmillService.lua and BeltRegistry.lua.

---

## 2026-04-30 — it-008: Implement ClickDetector chopper machine activation
PR: #19 (https://github.com/DevMello/roblox_agency/pull/19)
Status: done
Notes: ChopperService Script created at ServerScriptService.ChopperService.
  Wires ClickDetector on AutoChopper and Tree for both TeamA and TeamB.
  Server-side team validation: player.Team.Name (spaces stripped) vs team folder name.
  Log Part spawned at OutputPoint attachment position; tagged ResourceType=Log, OwnerTeam=<folder>.
  CLICK_COOLDOWN (0.5 s) enforced via os.clock() per UserId; cleared on PlayerRemoving.
  ConveyorBelt built from Conveyors folder segments, sorted by X (TeamB reversed).
  Source at games/industrial-tycoon/src/ServerScriptService/ChopperService.lua.

---

## 2026-04-30 — it-006: Place Lumber zone machine assets on both team halves
PR: #16 (https://github.com/DevMello/roblox_agency/pull/16)
Status: done
Notes: All Lumber zone assets placed in Studio via execute_luau for both team halves.
  Final world positions (Team A / Team B mirrored at x=0):
    Tree (4×20×4):      x=±350, y=10, z=0
    AutoChopper (6×8×6): x=±342, y=4,  z=0  — OutputPoint at local (∓3,0,0)
    ConveyorSegments×18: x=±338→±202, y=0.25, z=0 (8-stud spacing)
    Sawmill (20×15×20):  x=±200, y=7.5, z=0
    LogInput (4×0.5×4):  x=±210, y=0.25 — IsLogInput=true, CanCollide=false
    PlankOutput (4×0.5×4): x=±190, y=0.25 — IsPlankOutput=true, CanCollide=false
    CashPad (8×0.5×8):   x=±185, y=0.25 — IsCashPad=true, Neon yellow, CanCollide=false
  18 segments used (exceeds minimum 5) for full visual coverage and dense waypoints.
  Tree is single blocky Part (no detailed mesh — deferred to Blender MCP asset pass).
  Script idempotent. Source at games/industrial-tycoon/src/Assets/lumber-zone-assets.lua.
  Completes Milestone M2. M3 tasks it-008 and it-009 are now eligible.

---

## 2026-04-29 — it-013: Implement per-machine upgrade state server module
PR: #15 (https://github.com/DevMello/roblox_agency/pull/15)
Status: done
Notes: UpgradeStateService ModuleScript created at ServerScriptService.UpgradeStateService.
  Round-scoped in-memory table keyed by Workspace path. Exposes GetUpgradeLevel,
  SetUpgradeLevel (clamped to UPGRADE_MAX_LEVEL), GetAllUpgrades (shallow copy),
  ResetAllUpgrades (table.clear), RecordPurchase (delegates to PlayerDataService).
  Known limitation: RecordPurchase stores by machineId only (no speed/output distinction
  in DataStore schema yet — schema extension deferred to future task).
  Source at games/industrial-tycoon/src/ServerScriptService/UpgradeStateService.lua.

---

## 2026-04-29 — it-012: Implement team wallet server module
PR: #14 (https://github.com/DevMello/roblox_agency/pull/14)
Status: done
Notes: TeamService wallet API (AddToTeamWallet, GetTeamWallet, ResetWallets, GetWinningTeam)
  was already fully implemented in Studio from it-004. This task committed the source to git
  and verified compliance. Wallet mutations fire TeamWalletUpdated RemoteEvent synchronously.
  Source at games/industrial-tycoon/src/ServerScriptService/TeamService.lua.

---

## 2026-04-29 — it-007: Implement ConveyorBelt server module
PR: #13 (https://github.com/DevMello/roblox_agency/pull/13)
Status: done
Notes: ConveyorBelt ModuleScript created at ServerScriptService.ConveyorBelt. Closure-based
  implementation avoids --!strict metatable typing issues. Moves parts via CFrame lerp each
  Heartbeat tick (decision-2026-04-29-0001). Exposes AddPart, RemovePart, SetSpeed,
  OnPartArrived. Multiple belt instances can coexist. Arrivals dispatched via task.spawn.
  DEBUG_MODE guard on all print statements. Source at
  games/industrial-tycoon/src/ServerScriptService/ConveyorBelt.lua.

---

## 2026-04-30 — it-005: Build megamap geometry (mirrored halves, center zone)
PR: #12 (https://github.com/DevMello/roblox_agency/pull/12)
Status: done
Notes: Full 1200×1200 megamap built in Studio via execute_luau. Stud dimensions:
  BaseGround 1200×1×1200 at y=-0.5 (top at y=0). TeamA zone x=(-600,-50) center x=-325 width=550.
  Center strip x=(-50,+50) width=100. TeamB zone x=(+50,+600) center x=+325 width=550.
  TerritoryBorders 2×50×1200 walls at x=-50 (Bright red) and x=+50 (Bright blue).
  Tint overlays 550×0.2×1200 at transparency=0.85, CanCollide=false.
  SellDepot body 80×30×60 at (0,15,0). Roof 86×5×66 at (0,32.5,0).
  Entrance pillars+lintel at x=±40 framing a 20Z-wide gap.
  DepositZone 70×1×50 glowing yellow, attr DepositZone=true, SurfaceLight gold.
  Zone signs 60×10×4 with SurfaceGui text. 40 total descendants.
  All Parts Anchored=true; overlay Parts CanCollide=false.
  Builder script at games/industrial-tycoon/src/Assets/megamap-geometry.lua.

---

## 2026-04-30 — it-004: Teams service auto-balance and wallet data structure
PR: #11 (https://github.com/DevMello/roblox_agency/pull/11)
Status: done
Notes: TeamService ModuleScript in ServerScriptService. Auto-balance assigns joining players to smaller team (ties to Team A). In-memory TeamWallets dict resets on load and via ResetWallets(). AddToTeamWallet fires TeamWalletUpdated RemoteEvent to all clients synchronously (no yield between read/write). GetWinningTeam returns nil on tie. Source at games/industrial-tycoon/src/ServerScriptService/TeamService.lua. Note: Teams named "Team A" / "Team B" must exist in the Teams service before players join — a future setup task will create them.

---

## 2026-04-30 — it-003: Player data schema and DataStore module
PR: #10 (https://github.com/DevMello/roblox_agency/pull/10)
Status: done
Notes: PlayerDataService ModuleScript in ServerScriptService. Schema: money, boostBucks, upgradesPurchased, cosmeticsOwned, cosmetic_tickets. DataStore load on PlayerAdded with 3 retries and task.wait(2) gaps. Merge-with-defaults ensures schema evolution safety. All 7 public API functions typed. Cache cleared on PlayerRemoving. DataStore saves deferred to it-019. Source at games/industrial-tycoon/src/ServerScriptService/PlayerDataService.lua.

---

## 2026-04-29 — it-002: Declare RemoteEvents and RemoteFunctions
PR: #9 (https://github.com/DevMello/roblox_agency/pull/9)
Status: done
Notes: RemoteSetup Script created at ServerScriptService.RemoteSetup. Creates 9 RemoteEvents and 2 RemoteFunctions in ReplicatedStorage at server startup. Logic-only — no event connections. Validated via execute_luau test: 9 events and 2 functions confirmed created. Source file at games/industrial-tycoon/src/ServerScriptService/RemoteSetup.lua.

---

## 2026-04-29 — it-001: Create constants module
PR: #8 (https://github.com/DevMello/roblox_agency/pull/8)
Status: done
Notes: Constants ModuleScript created at ReplicatedStorage.Constants. All 22 constants defined per sprint spec. BOOST_BUCKS_PRODUCT_IDS, BOOST_BUCKS_AMOUNTS, and VIP_PASS_ID are empty-table/zero placeholders pending human sign-off (per decision-2026-04-29-0005). Module verified via require() in play test — returns correct values. Source file at games/industrial-tycoon/src/ReplicatedStorage/Constants.lua.
