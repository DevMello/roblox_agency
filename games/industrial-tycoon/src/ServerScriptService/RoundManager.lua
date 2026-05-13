--!strict

local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants           = require(ReplicatedStorage:WaitForChild("Constants"))
local TeamService         = require(ServerScriptService:WaitForChild("TeamService"))
local UpgradeStateService = require(ServerScriptService:WaitForChild("UpgradeStateService"))
local PlayerDataService   = require(ServerScriptService:WaitForChild("PlayerDataService"))
local WinHandler          = require(ServerScriptService:WaitForChild("WinHandler"))

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local RoundStateChanged  = RemoteEventsFolder:WaitForChild("RoundStateChanged") :: RemoteEvent
local RoundTimerTick     = RemoteEventsFolder:WaitForChild("RoundTimerTick")    :: RemoteEvent

type RoundState = "waiting" | "active" | "ended"

local function setState(state: RoundState, extra: { [string]: unknown }?): ()
	local payload: { [string]: unknown } = extra or {}
	payload.state = state
	RoundStateChanged:FireAllClients(payload)
end

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

local function waitingPhase(): ()
	setState("waiting", {})
	while #Players:GetPlayers() < Constants.MIN_PLAYER_COUNT do
		task.wait(1)
	end
end

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

local function endedPhase(): ()
	local winner: string? = TeamService.GetWinningTeam()
	local teamAWallet: number = TeamService.GetTeamWallet(Constants.TEAM_NAMES[1])
	local teamBWallet: number = TeamService.GetTeamWallet(Constants.TEAM_NAMES[2])

	setState("ended", {
		winnerTeam = (winner or false) :: unknown,
		isTie      = (winner == nil) :: unknown,
	})

	WinHandler.HandleRoundEnd(winner, teamAWallet, teamBWallet)
	saveAllPlayers()

	task.wait(Constants.INTERMISSION_DURATION)
end

task.spawn(function()
	while true do
		waitingPhase()
		activePhase()
		endedPhase()
	end
end)
