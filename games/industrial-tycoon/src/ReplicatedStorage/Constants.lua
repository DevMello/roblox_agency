--!strict

local Constants = {}

-- Round timing
Constants.ROUND_DURATION = 900
Constants.INTERMISSION_DURATION = 15
Constants.MIN_PLAYER_COUNT = 2

-- Teams
Constants.TEAM_NAMES = { "Team A", "Team B" }
Constants.TEAM_COLORS = {
	["Team A"] = BrickColor.new("Bright red"),
	["Team B"] = BrickColor.new("Bright blue"),
}

-- Input
Constants.CLICK_COOLDOWN = 0.5

-- Conveyor speeds (studs/sec per tier 1–5)
Constants.CONVEYOR_BASE_SPEED = {
	[1] = 8,
	[2] = 12,
	[3] = 18,
	[4] = 26,
	[5] = 36,
}

-- Upgrade multipliers (level 0–5)
Constants.SPEED_MULTIPLIER = {
	[0] = 1.0,
	[1] = 1.25,
	[2] = 1.6,
	[3] = 2.0,
	[4] = 2.5,
	[5] = 3.2,
}

Constants.OUTPUT_MULTIPLIER = {
	[0] = 1,
	[1] = 2,
	[2] = 3,
	[3] = 4,
	[4] = 5,
	[5] = 6,
}

-- Upgrade caps and costs
Constants.UPGRADE_MAX_LEVEL = 5
Constants.UPGRADE_COSTS = {
	speed  = { 100, 250, 500, 1000, 2000 },
	output = { 150, 350, 700, 1400, 2800 },
}

-- Economy
Constants.RESOURCE_VALUE = {
	Log   = 5,
	Plank = 10,
}

-- Machine timing
Constants.SAWMILL_PROCESS_TIME = 2

-- Cash collection
Constants.CASHPAD_COLLECT_RADIUS      = 10
Constants.VIP_COLLECTOR_RADIUS        = 15
Constants.VIP_COLLECTOR_POLL_INTERVAL = 2

-- DataStore
Constants.DATASTORE_KEY_PREFIX       = "Player_"
Constants.DATASTORE_NAME             = "PlayerData"
Constants.ROUND_HISTORY_DATASTORE    = "RoundHistory"

-- Monetisation — populated before launch
Constants.BOOST_BUCKS_PRODUCT_IDS = {}
Constants.BOOST_BUCKS_AMOUNTS      = {}
-- PLACEHOLDER: requires human sign-off on ratio before launch
Constants.BOOST_BUCKS_CONVERSION_NOTE =
	"1 Boost Buck approx 0.80 Robux at cheapest bundle tier -- PLACEHOLDER, requires human sign-off before launch"
Constants.VIP_PASS_ID = 0

Constants.DEBUG_MODE = false

return Constants
