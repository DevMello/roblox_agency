# Build Log — Industrial Megamap Tycoon

Append-only. Builder adds one entry per completed task. Never edit previous entries.

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
