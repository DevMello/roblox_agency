# Sprint Log — Industrial Megamap Tycoon

```yaml
sprint_id: industrial-tycoon-2026-04-29
date: "2026-04-29"
game_name: "Industrial Megamap Tycoon"
game_slug: industrial-tycoon
milestone_ref: industrial-tycoon-m1
status: complete
total_estimated_minutes: 220
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
      No active overrides exist. All 5 sprint tasks cleared with no conflicts.

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
      All M1 tasks are eligible for tonight's sprint.
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
      Budget note: M1 (it-001 through it-004) totals 140 min against a 288-min budget,
      leaving 148 min spare. it-005 (first M2 task — megamap geometry) has only a soft
      dependency on it-001 and is an independent asset task. It has been added as a
      cross-milestone early start to utilise the remaining budget. it-006 (160 min
      cumulative with it-005) would exceed the remaining capacity and is deferred to
      the next sprint. This decision is recorded here; no decisions.md entry is
      required as it is a routine scheduling judgment, not an architectural decision.

task_list:

  - task_id: it-001
    title: "Create constants module"
    type: config
    description: >
      Create a shared Constants ModuleScript in ReplicatedStorage (readable by both
      server and client scripts). The script must begin with --!strict.
      Use game:GetService() for any service access.

      Define the following values (all named constants, no magic numbers):
        - ROUND_DURATION: 900 (seconds)
        - INTERMISSION_DURATION: 15 (seconds)
        - MIN_PLAYER_COUNT: 2
        - TEAM_NAMES: { "Team A", "Team B" }
        - TEAM_COLORS: { ["Team A"] = BrickColor.new("Bright red"), ["Team B"] = BrickColor.new("Bright blue") }
        - CLICK_COOLDOWN: 0.5 (seconds)
        - CONVEYOR_BASE_SPEED: { [1] = 8, [2] = 12, [3] = 18, [4] = 26, [5] = 36 } (studs/sec per tier)
        - SPEED_MULTIPLIER: { [0]=1.0, [1]=1.25, [2]=1.6, [3]=2.0, [4]=2.5, [5]=3.2 }
        - OUTPUT_MULTIPLIER: { [0]=1, [1]=2, [2]=3, [3]=4, [4]=5, [5]=6 }
        - UPGRADE_MAX_LEVEL: 5
        - UPGRADE_COSTS: { speed = {100,250,500,1000,2000}, output = {150,350,700,1400,2800} }
        - RESOURCE_VALUE: { Log = 5, Plank = 10 }
        - SAWMILL_PROCESS_TIME: 2 (seconds)
        - CASHPAD_COLLECT_RADIUS: 10 (studs)
        - VIP_COLLECTOR_RADIUS: 15 (studs)
        - VIP_COLLECTOR_POLL_INTERVAL: 2 (seconds)
        - DATASTORE_KEY_PREFIX: "Player_"
        - DATASTORE_NAME: "PlayerData"
        - ROUND_HISTORY_DATASTORE: "RoundHistory"
        - BOOST_BUCKS_PRODUCT_IDS: {} (empty table placeholder — populate before launch)
        - BOOST_BUCKS_AMOUNTS: {} (empty table placeholder)
        - BOOST_BUCKS_CONVERSION_NOTE: "1 Boost Buck ≈ 0.80 Robux at cheapest bundle tier — PLACEHOLDER, requires human sign-off before launch"
        - VIP_PASS_ID: 0 (placeholder — populate before launch)
        - DEBUG_MODE: false

      All other scripts must import this module and reference these names rather than
      using inline literals.
    estimated_minutes: 20
    assigned_agent: builder
    depends_on: []
    status: done
    attempt_count: 1
    worker_id: null
    worker_started_at: "2026-04-29T23:10:00Z"
    completed_at: "2026-04-29T23:30:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/8"

  - task_id: it-002
    title: "Declare RemoteEvents and RemoteFunctions"
    type: config
    description: >
      Create a Script in ServerScriptService (runs on server at startup) that builds
      the RemoteEvents and RemoteFunctions folders in ReplicatedStorage.
      The script must begin with --!strict.
      Use game:GetService("ReplicatedStorage") — never game.ReplicatedStorage.

      Create folder "RemoteEvents" in ReplicatedStorage and insert one RemoteEvent
      instance for each of the following names:
        MoneyUpdated, TeamWalletUpdated, RoundStateChanged, RoundTimerTick,
        UpgradePurchased, LeaderboardUpdated, SellDepotDeposited,
        BonusDropFired, BoostBucksUpdated

      Create folder "RemoteFunctions" in ReplicatedStorage and insert one
      RemoteFunction instance for each of the following names:
        RequestUpgradePurchase, GetPlayerData

      The script contains NO logic beyond the declarations — it creates the instances
      once on startup and does nothing else. No event connections, no game logic.
      All other scripts that need these remotes must find them via
      ReplicatedStorage:WaitForChild("RemoteEvents"):WaitForChild("EventName").
    estimated_minutes: 20
    assigned_agent: builder
    depends_on: []
    status: done
    attempt_count: 1
    worker_id: null
    worker_started_at: "2026-04-29T23:32:00Z"
    completed_at: "2026-04-29T23:45:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/9"

  - task_id: it-003
    title: "Player data schema and DataStore module"
    type: data
    description: >
      Create a PlayerDataService ModuleScript in ServerScriptService.
      The script must begin with --!strict.
      Use game:GetService() for all service access.

      Canonical player data schema (the shape stored in DataStore and held in memory):
        {
          money: number,
          boostBucks: number,
          upgradesPurchased: { [machineId: string]: number },
          cosmeticsOwned: { [id: string]: boolean },
          cosmetic_tickets: number
        }

      On player join:
        - Attempt DataStore load: DataStoreService:GetDataStore(Constants.DATASTORE_NAME)
          :GetAsync(Constants.DATASTORE_KEY_PREFIX .. userId)
        - Retry up to 3 times with task.wait(2) between attempts.
        - If all attempts fail: use default schema (all zeros, empty tables) and
          warn("PlayerDataService: DataStore load failed for " .. userId).
        - Merge loaded data with schema defaults so new fields added later do not error.

      Expose these typed functions (all server-side only, never call from client):
        GetData(player: Player): table
        SetMoney(player: Player, amount: number): void
        AddMoney(player: Player, delta: number): void
        GetUpgradeLevel(player: Player, machineId: string): number
        SetUpgradeLevel(player: Player, machineId: string, level: number): void
        AddBoostBucks(player: Player, amount: number): void
        SpendBoostBucks(player: Player, amount: number): boolean  -- returns false if insufficient

      Do NOT auto-save on every mutation. Saves are triggered explicitly by Round Manager
      (round end) and by the PlayerRemoving event (handled in it-019).
      This module only defines the schema and in-memory accessors.
      The actual DataStore save/load calls (with full retry logic) are implemented in it-019.
      For now, AddMoney etc. modify the in-memory table only.
    estimated_minutes: 50
    assigned_agent: builder
    depends_on:
      - it-001
    status: done
    attempt_count: 1
    worker_id: null
    worker_started_at: "2026-04-29T23:47:00Z"
    completed_at: "2026-04-30T00:10:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/10"

  - task_id: it-004
    title: "Teams service auto-balance and wallet data structure"
    type: scripting
    description: >
      Create a TeamService ModuleScript in ServerScriptService.
      The script must begin with --!strict.
      Use game:GetService() for ALL service access — never game.Teams, game.Players, etc.

      Team assignment (on player join):
        - Count players on Team A and Team B using game:GetService("Teams").
        - Assign the joining player to the team with fewer members.
        - On tie, assign to Team A.
        - Call player.Team = Teams:FindFirstChild(teamName) to set the Roblox Team.
        - Connect to game:GetService("Players").PlayerAdded to trigger on every join.

      In-memory wallet state (initialised to 0 at module load; reset at round start):
        local TeamWallets: { [string]: number } = {
          [Constants.TEAM_NAMES[1]] = 0,  -- "Team A"
          [Constants.TEAM_NAMES[2]] = 0,  -- "Team B"
        }

      Expose these typed functions:
        GetTeamWallet(teamName: string): number
        AddToTeamWallet(teamName: string, amount: number): void
          -- atomically increments wallet, then fires TeamWalletUpdated RemoteEvent
          -- to all players: :FireAllClients({ teamA = ..., teamB = ... })
        ResetWallets(): void
          -- zeros both wallets, fires TeamWalletUpdated to all clients
        GetWinningTeam(): string?
          -- returns team name with strictly higher wallet, or nil on tie

      Fire TeamWalletUpdated via:
        local re = game:GetService("ReplicatedStorage")
          :WaitForChild("RemoteEvents"):WaitForChild("TeamWalletUpdated")
        re:FireAllClients({ teamA = TeamWallets["Team A"], teamB = TeamWallets["Team B"] })

      Thread safety note: Lua is single-threaded; no mutex is needed, but AddToTeamWallet
      must not yield between reading and writing the wallet value.
    estimated_minutes: 50
    assigned_agent: builder
    depends_on:
      - it-001
      - it-002
    status: done
    attempt_count: 1
    worker_id: null
    worker_started_at: "2026-04-30T00:12:00Z"
    completed_at: "2026-04-30T00:30:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/11"

  - task_id: it-005
    title: "Build megamap geometry (mirrored halves, center zone)"
    type: asset
    description: >
      In Roblox Studio, construct the megamap Workspace layout using the Studio MCP.
      This is the first M2 task; it is scheduled tonight as an early start because
      M1 fits within 140 min and 148 min of budget remains.

      Map structure:
        Total map footprint: 1200 studs wide (x-axis) × 1200 studs deep (z-axis).
        Flat terrain base (use a large flat BasePart for the ground, not terrain sculpting).

        Team A occupies x < −50 (approximately 550×1200 studs).
        Neutral center strip: x −50 to x +50 (100 studs wide × 1200 deep).
        Team B occupies x > +50 (approximately 550×1200 studs).

      Workspace hierarchy to create:
        Workspace
          Map
            TeamA
              LumberZone        (a Folder — no machines yet, placed in it-006)
              MineZone          (a Folder with a large label Part: "MINE ZONE — COMING SOON")
              OilZone           (a Folder with a large label Part: "OIL ZONE — COMING SOON")
              TerritoryBorder   (a thin tall wall Part colored Bright red along x=−50 boundary)
            TeamB
              LumberZone        (a Folder — no machines yet)
              MineZone          (a Folder with label Part)
              OilZone           (a Folder with label Part)
              TerritoryBorder   (a thin tall wall Part colored Bright blue along x=+50 boundary)
            Center
              SellDepot         (a large warehouse Model — see below)
              GroundPlane       (a neutral-colored 100×1200 floor Part)

      SellDepot building (inside Center > SellDepot Model):
        - Main warehouse body: a large box Part (~80 studs wide × 60 deep × 30 tall), medium gray.
        - Two entrance archways on each long face (Team A side and Team B side), created by
          subtracting or leaving open a 20×25-stud gap in the wall — use separate Part pieces
          to frame the opening rather than negating parts.
        - A roof Part (slightly larger than the main body, 5 studs thick).
        - A floor marker Part inside the depot labeled "DepositZone" (a glowing yellow plate
          covering most of the interior floor), tagged with attribute DepositZone = true.
        - Name the entrance walkway Parts "EntranceA" (Team A side) and "EntranceB" (Team B side).

      Ground color coding:
        - Team A half ground: BrickColor Bright red, Transparency 0.85 (tinted overlay Part).
        - Team B half ground: BrickColor Bright blue, Transparency 0.85.
        - Center ground: BrickColor Medium stone grey.

      After placing all geometry:
        - Anchor all Parts (Anchored = true).
        - Set CanCollide = true on all walkable surfaces; CanCollide = false on the tint overlay Parts.
        - Log the final stud dimensions chosen for each zone in progress.md.

      Use Constants team color values (from it-001) for BrickColor assignments wherever possible.
      Reference colors via require(game:GetService("ReplicatedStorage"):WaitForChild("Constants")).
    estimated_minutes: 80
    assigned_agent: builder
    depends_on: []
    status: done
    attempt_count: 1
    worker_id: null
    worker_started_at: "2026-04-30T00:32:00Z"
    completed_at: "2026-04-30T01:00:00Z"
    pr_reference: "https://github.com/DevMello/roblox_agency/pull/12"
```
