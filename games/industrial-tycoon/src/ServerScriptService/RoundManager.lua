--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))
local TeamService = require(ServerScriptService:WaitForChild("TeamService"))
local UpgradeStateService = require(ServerScriptService:WaitForChild("UpgradeStateService"))
local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local RoundStateChanged = RemoteEventsFolder:WaitForChild("RoundStateChanged") :: RemoteEvent
local RoundTimerTick    = RemoteEventsFolder:WaitForChild("RoundTimerTick") :: RemoteEvent

type RoundState = "waiting" | "active" | "ended"

-- Broadcast state change to all clients
local function setState(state: RoundState, extra: { [string]: unknown }?): ()
	local payload: { [string]: unknown } = extra or {}
	payload.state = state
	RoundStateChanged:FireAllClients(payload)
end

-- Best-effort save for all online players (full retry logic added by it-019)
local function saveAllPlayers(): ()
	for _, player in ipairs(Players:GetPlayers()) do
		task.spawn(function()
			local ok, err = pcall(PlayerDataService.SavePlayer, player)
			if not ok and Constants.DEBUG_MODE then
				warn("RoundManager: save failed for", player.Name, tostring(err))
			end
		end)
	end
end

-- Waiting phase: hold until minimum player count, then return
local function waitingPhase(): ()
	setState("waiting", {})
	while #Players:GetPlayers() < Constants.MIN_PLAYER_COUNT do
		task.wait(1)
	end
end

-- Active phase: reset state, run countdown, fire timer ticks
local function activePhase(): ()
	TeamService.ResetWallets()
	UpgradeStateService.ResetAllUpgrades()
	setState("active", {})

	local secondsLeft = Constants.ROUND_DURATION
	while secondsLeft > 0 do
		task.wait(1)
		secondsLeft -= 1
		RoundTimerTick:FireAllClients({ secondsLeft = secondsLeft })
	end
end

-- Ended phase: determine winner, save data, wait for intermission
local function endedPhase(): ()
	local winner: string? = TeamService.GetWinningTeam()
	setState("ended", {
		winnerTeam = (winner or false) :: unknown,
		isTie = (winner == nil) :: unknown,
	})

	saveAllPlayers()

	task.wait(Constants.INTERMISSION_DURATION)
end

-- Round loop
task.spawn(function()
	while true do
		waitingPhase()
		activePhase()
		endedPhase()
	end
end)
