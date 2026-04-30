--!strict

local Players = game:GetService("Players")
local Teams = game:GetService("Teams")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))

-- Team wallets -- reset to 0 at module load and at round start
local TeamWallets: { [string]: number } = {
	[Constants.TEAM_NAMES[1]] = 0,
	[Constants.TEAM_NAMES[2]] = 0,
}

local TeamService = {}

-- Assign joining player to the team with fewer members; ties go to Team A
local function assignTeam(player: Player): ()
	local teamA = Teams:FindFirstChild(Constants.TEAM_NAMES[1]) :: Team?
	local teamB = Teams:FindFirstChild(Constants.TEAM_NAMES[2]) :: Team?

	if not teamA or not teamB then
		warn("TeamService: Teams not found in Teams service -- ensure Teams are created before PlayerAdded fires")
		return
	end

	local countA = #teamA:GetPlayers()
	local countB = #teamB:GetPlayers()

	if countB < countA then
		player.Team = teamB
	else
		player.Team = teamA
	end
end

-- Fire TeamWalletUpdated to all clients
local function fireWalletUpdate(): ()
	local re = ReplicatedStorage
		:WaitForChild("RemoteEvents")
		:WaitForChild("TeamWalletUpdated") :: RemoteEvent

	re:FireAllClients({
		teamA = TeamWallets[Constants.TEAM_NAMES[1]],
		teamB = TeamWallets[Constants.TEAM_NAMES[2]],
	})
end

function TeamService.GetTeamWallet(teamName: string): number
	return TeamWallets[teamName] or 0
end

-- Atomically increments the team wallet and fires the update event.
-- Must not yield between read and write (Lua is single-threaded within a sync sequence).
function TeamService.AddToTeamWallet(teamName: string, amount: number): ()
	TeamWallets[teamName] = (TeamWallets[teamName] or 0) + amount
	fireWalletUpdate()
end

function TeamService.ResetWallets(): ()
	TeamWallets[Constants.TEAM_NAMES[1]] = 0
	TeamWallets[Constants.TEAM_NAMES[2]] = 0
	fireWalletUpdate()
end

-- Returns the team name with a strictly higher wallet total, or nil if tied.
function TeamService.GetWinningTeam(): string?
	local aWallet = TeamWallets[Constants.TEAM_NAMES[1]]
	local bWallet = TeamWallets[Constants.TEAM_NAMES[2]]
	if aWallet > bWallet then
		return Constants.TEAM_NAMES[1]
	elseif bWallet > aWallet then
		return Constants.TEAM_NAMES[2]
	end
	return nil
end

Players.PlayerAdded:Connect(function(player: Player)
	assignTeam(player)
end)

return TeamService
