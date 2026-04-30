# Sprint Log — Industrial Megamap Tycoon

```yaml
sprint_id: industrial-tycoon-2026-04-29
date: "2026-04-29"
game_name: "Industrial Megamap Tycoon"
game_slug: industrial-tycoon
milestone_ref: industrial-tycoon-m2
status: planned
total_estimated_minutes: 260
active_workers: []

skipped_due_to_blocker: []
skipped_due_to_override: []

conflict_report:
  checked: "2026-04-29T23:00:00Z"
  conflicts_found: []
  no_conflict_confirmation:
    tasks_reviewed: 5
    message: >
      Override check ran against memory/human-overrides.md.
      No active overrides exist. All 5 candidate tasks cleared with no conflicts.

notes:
  - timestamp: "2026-04-29T23:00:00Z"
    type: info
    message: >
      Override check completed. memory/human-overrides.md contains no active entries.
      All candidate tasks are clear to schedule.
  - timestamp: "2026-04-29T23:00:00Z"
    type: info
    message: >
      Blocker check completed. memory/blockers.md contains no active blockers.
      All eligible tasks can proceed tonight.
  - timestamp: "2026-04-29T23:00:00Z"
    type: info
    message: >
      TBD PR check: gh pr list --label tbd-human --state open returned zero results.
      No PRs to triage.
  - timestamp: "2026-04-29T23:00:00Z"
    type: info
    message: >
      Worker assignment: memory/workers.md contains no registered workers.
      Running in single-machine mode. All worker_id fields set to null.
  - timestamp: "2026-04-29T23:00:00Z"
    type: info
    message: >
      M1 (it-001 through it-004) and it-005 completed in prior sprint.
      Active milestone advances to M2. it-006 is the sole remaining M2 task.

      Eligible tasks this sprint (all hard deps satisfied):
        it-006 (M2, asset, 80 min)   — depends on it-005 (done)
        it-007 (M3, scripting, 80 min) — depends on it-001 (done)
        it-012 (M4, scripting, 50 min) — depends on it-004 (done)
        it-013 (M5, scripting, 50 min) — depends on it-001 + it-003 (done)
        it-022 (M7, scripting, 50 min) — depends on it-001 + it-003 (done)

      Budget: 288 min available. it-006 + it-007 + it-012 + it-013 = 260 min.
      Adding it-022 (50 min) would reach 310 min (> 288 limit) — deferred to next sprint.

      Ordering: scripting tasks first (it-007, it-012, it-013), asset task last (it-006).
      All four tasks are independent of each other; type ordering rule applied per Step 5.

      Completing it-006 closes M2. After this sprint, M3 tasks it-008 and it-009 become
      eligible (both depend on it-006 and it-007, both of which will be done).

task_list:

  - task_id: it-007
    title: "Implement ConveyorBelt server module"
    type: scripting
    description: >
      Create a ConveyorBelt ModuleScript in ServerScriptService.
      The script must begin with --!strict.
      Use game:GetService() for all service access.

      This module is the authoritative physics driver for all conveyor movement.
      Per decision-2026-04-29-0001: resource parts are moved server-side using CFrame
      updates at each RunService.Heartbeat tick (NOT client-side tweening). This ensures
      authoritative server positions for future steal mechanics (post-launch) and for
      consistent CashPad touch detection.

      Require the Constants module from ReplicatedStorage at the top of the file to
      access CONVEYOR_BASE_SPEED and SPEED_MULTIPLIER tables.

      Expose this public API:

        ConveyorBelt.new(segmentParts: {BasePart}, speed: number): ConveyorBeltInstance
          Creates a controller for a chain of conveyor segment Parts.
          segmentParts defines the ordered waypoint chain. speed is in studs/second.

        ConveyorBeltInstance:AddPart(part: BasePart): void
          Registers a resource part to be moved along this conveyor starting from
          the first waypoint. The part begins moving on the next Heartbeat.

        ConveyorBeltInstance:SetSpeed(speed: number): void
          Updates movement speed for all currently moving parts on this belt.
          Called by the upgrade effect system when a Speed upgrade is purchased.

        ConveyorBeltInstance:RemovePart(part: BasePart): void
          Deregisters a part from this belt (called when part reaches destination
          or is collected). The part stops moving and is released from tracking.

      Internal implementation:
        - Connect to game:GetService("RunService").Heartbeat.
        - Each Heartbeat tick, move each registered part forward along the waypoint
          chain at the belt's current speed (studs/second * delta time).
        - Waypoint traversal: compute distance to next waypoint; if the part reaches
          or passes a waypoint, snap to that waypoint and continue toward the next.
        - When a part reaches the FINAL waypoint: call the registered arrival callback
          (if any), then call RemovePart automatically.
        - Expose a method ConveyorBeltInstance:OnPartArrived(callback: (part: BasePart) -> void)
          to let callers (Sawmill, CashPad) register arrival handlers.
        - Multiple ConveyorBeltInstance objects can coexist (one per conveyor run).

      Use task.spawn for any per-part work that may yield.
      Never use spawn(), wait(), or delay().
      No bare print() statements — guard all logging with:
        if require(game:GetService("ReplicatedStorage"):WaitForChild("Constants")).DEBUG_MODE then
          print(...)
        end
    estimated_minutes: 80
    assigned_agent: builder
    depends_on:
      - it-001
    status: done
    attempt_count: 1
    worker_id: default
    worker_started_at: "2026-04-29T23:10:00Z"
    completed_at: "2026-04-29T23:30:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/13"

  - task_id: it-012
    title: "Implement team wallet server module"
    type: scripting
    description: >
      Extend the TeamService ModuleScript in ServerScriptService (created in it-004)
      to implement the runtime wallet operations.

      The script must begin with --!strict.
      Use game:GetService() for all service access.

      it-004 created TeamService with team assignment logic and a TeamWallets table
      initialised to 0. This task implements the full wallet API on top of that foundation.

      Ensure TeamService exposes these typed functions (add them to the existing module):

        AddToTeamWallet(teamName: string, amount: number): void
          Atomically increments TeamWallets[teamName] by amount.
          Must NOT yield between reading and writing (Lua is single-threaded;
          the Roblox scheduler guarantees no preemption within a single synchronous
          sequence — do not insert any task.wait() calls mid-increment).
          After incrementing, immediately fire TeamWalletUpdated RemoteEvent to all clients:
            local re = game:GetService("ReplicatedStorage")
            local event = re:WaitForChild("RemoteEvents"):WaitForChild("TeamWalletUpdated")
            event:FireAllClients({
              teamA = TeamWallets[Constants.TEAM_NAMES[1]],
              teamB = TeamWallets[Constants.TEAM_NAMES[2]]
            })

        GetTeamWallet(teamName: string): number
          Returns TeamWallets[teamName]. Returns 0 if teamName is unrecognised (defensive).

        ResetWallets(): void
          Sets both entries in TeamWallets to 0.
          Fires TeamWalletUpdated to all clients with both values = 0.

        GetWinningTeam(): string?
          Returns the team name with a strictly higher wallet total.
          Returns nil if wallets are tied (including both at 0).

      If these functions already exist in the module from it-004 as stubs, complete them.
      If they do not exist, add them.
      Do not remove or modify the team assignment logic from it-004.

      Require the Constants module from ReplicatedStorage for TEAM_NAMES.
      No bare print() statements — use DEBUG_MODE guard.
      Never use spawn(), wait(), or delay() — use task.* equivalents if yielding is needed.
    estimated_minutes: 50
    assigned_agent: builder
    depends_on:
      - it-004
    status: done
    attempt_count: 1
    worker_id: default
    worker_started_at: "2026-04-29T23:31:00Z"
    completed_at: "2026-04-29T23:45:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/14"

  - task_id: it-013
    title: "Implement per-machine upgrade state server module"
    type: scripting
    description: >
      Create an UpgradeStateService ModuleScript in ServerScriptService.
      The script must begin with --!strict.
      Use game:GetService() for all service access.

      This module tracks in-round, per-machine upgrade levels.
      Upgrade levels are round-scoped (per decision-2026-04-29-0002): they reset to 0
      at round start and are NOT persisted to DataStore as current levels. The DataStore
      (via PlayerDataService) records only a history of which upgrades were purchased
      (for cosmetic/analytics). The authoritative in-round level is held in this module.

      Require Constants from ReplicatedStorage for UPGRADE_MAX_LEVEL and UPGRADE_COSTS.
      Require PlayerDataService from ServerScriptService for recording purchase history.

      In-memory store (module-level, not per-player):
        local UpgradeState: { [string]: { speedLevel: number, outputLevel: number } } = {}
        The key is the machine's full Workspace path string, e.g.:
          "Map.TeamA.LumberZone.Machines.AutoChopper"

      Expose these typed functions:

        GetUpgradeLevel(machineId: string, upgradeType: string): number
          Returns the current level for the given machine and upgrade type.
          upgradeType is either "speed" or "output".
          Returns 0 if the machine has no entry yet (safe default).

        SetUpgradeLevel(machineId: string, upgradeType: string, level: number): void
          Sets the level for the given machine and upgrade type.
          Clamps level to [0, Constants.UPGRADE_MAX_LEVEL] — never stores out-of-range values.
          Creates the entry in UpgradeState if it does not exist yet.

        GetAllUpgrades(): { [string]: { speedLevel: number, outputLevel: number } }
          Returns a shallow copy of the entire UpgradeState table.
          Used by the upgrade shop GUI to display current levels on open.

        ResetAllUpgrades(): void
          Clears the UpgradeState table (sets all machines back to 0/0).
          Called by Round Manager at round start.

        RecordPurchase(player: Player, machineId: string, upgradeType: string, newLevel: number): void
          Calls PlayerDataService.SetUpgradeLevel(player, machineId, newLevel) to record
          the purchase in the player's historical data. This is for analytics only —
          the in-memory UpgradeState is the authoritative runtime state.

      No bare print() — use DEBUG_MODE guard from Constants.
      Never use spawn(), wait(), or delay().
    estimated_minutes: 50
    assigned_agent: builder
    depends_on:
      - it-001
      - it-003
    status: pending
    attempt_count: 0
    worker_id: null

  - task_id: it-006
    title: "Place Lumber zone machine assets on both team halves"
    type: asset
    description: >
      Using the Roblox Studio MCP, place the following physical instances within each
      team's LumberZone folder in Workspace (created as an empty Folder in it-005).
      Mirror positions symmetrically for Team B (mirror across x=0 axis).

      NOTE: it-005 created the map structure and it-001 created the Constants module.
      Reference team colors via:
        require(game:GetService("ReplicatedStorage"):WaitForChild("Constants")).TEAM_COLORS

      For EACH team half (Team A under Workspace > Map > TeamA > LumberZone,
                         Team B under Workspace > Map > TeamB > LumberZone):

        Create a "Machines" folder inside LumberZone.

        1. Tree model (log source):
           - A stacked-cylinder or blocky Part group representing a tree (approximately
             4 studs wide × 20 studs tall).
           - Must contain a ClickDetector child (MaxActivationDistance = 10).
           - Named "Tree".
           - Placed near the far end of the team half from the center strip.
           - Team A position: approximately (-350, 3, 0); Team B: mirrored at (350, 3, 0).

        2. AutoChopper machine:
           - A blocky rectangular Part model (approximately 6 × 6 × 8 studs).
           - Must contain a ClickDetector child (MaxActivationDistance = 10).
           - Named "AutoChopper".
           - Has an attribute: OutputPoint (a CFrame or Vector3 attachment) indicating
             where spawned logs appear. Use an Attachment part named "OutputPoint"
             as a child of the AutoChopper model.
           - Placed adjacent to the Tree (approximately 8 studs toward center).
           - Team A position: approximately (-342, 3, 0); Team B: mirrored.

        3. Conveyor segments (minimum 5 Parts forming a straight run):
           - Each segment is a flat rectangular Part, approximately 8 studs long ×
             4 studs wide × 0.5 studs tall, named "ConveyorSegment".
           - Arrange in a straight line from AutoChopper toward the Sawmill.
           - Tag each ConveyorSegment with attribute: IsConveyorSegment = true.
           - All segments parented under a "Conveyors" Folder inside LumberZone.
           - Use a consistent team-color stripe (BrickColor from Constants) on the
             surface to visually distinguish Team A and Team B conveyors.
           - Team A conveyor runs from approximately x=-338 toward x=-200 (center-side).

        4. Sawmill building:
           - A blocky warehouse Part group (approximately 20 × 20 × 15 studs).
           - Named "Sawmill".
           - Contains two child Parts:
               "LogInput"   — a flat trigger plate (4 × 4 × 0.5 studs) at the intake
                              end, tagged with attribute IsLogInput = true.
               "PlankOutput" — a flat trigger plate at the output end, tagged
                              with attribute IsPlankOutput = true.
           - Placed at the center-side end of the conveyor run.
           - Team A position: approximately (-200, 3, 0).

        5. CashPad:
           - A flat glowing floor plate Part (8 × 8 × 0.5 studs), named "CashPad".
           - Material: Neon. Color: BrickColor.new("Bright yellow").
           - Tagged with attribute: IsCashPad = true.
           - Placed immediately adjacent to PlankOutput of Sawmill.
           - Team A position: approximately (-185, 1, 0).

      Hierarchy after placement (both teams):
        Workspace > Map > TeamA > LumberZone > Machines
          Tree
          AutoChopper
          Sawmill
          CashPad
        Workspace > Map > TeamA > LumberZone > Conveyors
          ConveyorSegment (×5 minimum)
        (same structure under TeamB, mirrored)

      After placing all assets:
        - Set Anchored = true on all Parts.
        - Set CanCollide = true on all walkable/solid surfaces.
        - Set CanCollide = false on the CashPad (it is a trigger, not a physical blocker).
        - Log the final positions chosen for both team halves in progress.md.

      This task completes Milestone M2. After completion, M3 tasks it-008 and it-009
      become eligible (both required it-005, it-006, and it-007 — all will be done
      by end of this sprint).
    estimated_minutes: 80
    assigned_agent: builder
    depends_on:
      - it-005
    status: pending
    attempt_count: 0
    worker_id: null
```
