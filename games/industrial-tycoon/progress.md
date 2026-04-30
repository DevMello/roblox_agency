# Build Log — Industrial Megamap Tycoon

Append-only. Builder adds one entry per completed task. Never edit previous entries.

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
