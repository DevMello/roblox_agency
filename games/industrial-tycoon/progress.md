# Build Log — Industrial Megamap Tycoon

Append-only. Builder adds one entry per completed task. Never edit previous entries.

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
