# Roblox Publish Readiness Checklist

Pre-publish readiness checklist applied when a game milestone is considered complete enough to publish or share for playtesting.

Run this checklist before marking any milestone as publishable. All items must pass before the game can be shared publicly.

---

## Game Services

- [ ] **PUB-01** `Players` service is present and used for all player join/leave handling.
- [ ] **PUB-02** `ReplicatedStorage` contains the RemoteEvents module with all events declared.
- [ ] **PUB-03** `ServerScriptService` contains at least one Script managing game state.
- [ ] **PUB-04** `StarterPlayerScripts` or `StarterCharacterScripts` contains client-side scripts if the game has client input handling.
- [ ] **PUB-05** If the game uses GUIs: `StarterGui` contains the required ScreenGui instances.

---

## DataStore

- [ ] **PUB-06** If the spec includes player data persistence: a DataStore module is present in `ServerScriptService`.
- [ ] **PUB-07** The DataStore module handles load failures gracefully (wraps DataStore:GetAsync in pcall, kicks or retries the player on failure rather than silently giving default data that may overwrite valid data).
- [ ] **PUB-08** DataStore:SetAsync or UpdateAsync is called in a pcall.
- [ ] **PUB-09** Player data is saved on `Players.PlayerRemoving` and on `game:BindToClose()`.
- [ ] **PUB-10** If the spec does not include data persistence: no DataStore code is present (do not add it speculatively).

---

## Monetisation

- [ ] **PUB-11** If the spec includes game passes: all game passes are declared in a constants module with their correct asset IDs.
- [ ] **PUB-12** If the spec includes developer products: all products are declared and the `ProcessReceipt` callback is implemented.
- [ ] **PUB-13** If the spec includes cosmetics: the cosmetic grant system validates that the player has the required game pass before applying the cosmetic.
- [ ] **PUB-14** No monetisation code is present if the spec does not include monetisation.

---

## Game Metadata

- [ ] **PUB-15** A game description placeholder exists (even if it's a generic "Coming soon" text — it should not be blank, as blank descriptions reduce discoverability).
- [ ] **PUB-16** A thumbnail placeholder exists (at minimum a solid colour image — a blank thumbnail looks unfinished in the search results).

---

## Debug Code

- [ ] **PUB-17** Zero bare `print()` statements in any script in `ServerScriptService`, `StarterPlayerScripts`, or `StarterCharacterScripts`.
- [ ] **PUB-18** All `DEBUG_MODE` constants are set to `false`.
- [ ] **PUB-19** No `warn()` calls that produce messages visible to players in the developer console (client-side warn calls are visible to players in developer mode).

---

## RemoteEvent Security

- [ ] **PUB-20** Every `RemoteEvent.OnServerEvent` handler validates the calling player.
- [ ] **PUB-21** Every `RemoteFunction.OnServerInvoke` handler validates the calling player and returns a safe default value rather than erroring if validation fails.
- [ ] **PUB-22** No `RemoteFunction.OnClientInvoke` is used from the server in a way that could be exploited (as noted in LU-17).

---

## Performance

- [ ] **PUB-23** No `RunService.Heartbeat` or `RunService.RenderStepped` connections that perform unbounded work (e.g. iterating all workspace instances every frame).
- [ ] **PUB-24** All event connections that are created dynamically (e.g. on `PlayerAdded`) are disconnected when the associated player leaves.
- [ ] **PUB-25** No infinite loops using `task.wait(0)` or `task.wait()` without a minimum delay — minimum heartbeat interval is `task.wait(0.1)`.

---

## Final Gate

A milestone may only be marked publishable when:
- All `PUB-01` through `PUB-25` items applicable to this spec either pass or are marked N/A with documented reason.
- The last playtest eval passed with zero console errors.
- No open `qa-failed` PRs exist for this game.
