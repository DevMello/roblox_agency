--!strict

-- LeaderboardPublisher: listens for server-side wallet and round-state events,
-- then broadcasts LeaderboardUpdated RemoteEvent to all clients.
--
-- Integration note: TeamService must fire ServerStorage.BindableEvents.TeamWalletUpdated
-- on every AddToTeamWallet call. RoundManager must fire RoundStateChangedServer BindableEvent
-- on every setState call. These updates are tracked in progress.md.

local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local ServerStorage       = game:GetService("ServerStorage")

local TeamService = require(ServerScriptService:WaitForChild("TeamService"))

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local LeaderboardUpdated = RemoteEventsFolder:WaitForChild("LeaderboardUpdated") :: RemoteEvent

-- BindableEvents live in ServerStorage (server-to-server only)
local BindableEventsFolder  = ServerStorage:WaitForChild("BindableEvents")
local TeamWalletUpdatedBE   = BindableEventsFolder:WaitForChild("TeamWalletUpdated")    :: BindableEvent
local RoundStateChangedBE   = BindableEventsFolder:WaitForChild("RoundStateChangedServer") :: BindableEvent

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))

local function broadcastCurrentWallets(): ()
	LeaderboardUpdated:FireAllClients({
		teamA = TeamService.GetTeamWallet(Constants.TEAM_NAMES[1]),
		teamB = TeamService.GetTeamWallet(Constants.TEAM_NAMES[2]),
	})
end

-- On any team wallet change: rebroadcast current totals
TeamWalletUpdatedBE.Event:Connect(function()
	broadcastCurrentWallets()
end)

-- On round state change: reset leaderboard to zeros when round resets to waiting
RoundStateChangedBE.Event:Connect(function(state: string)
	if state == "waiting" then
		LeaderboardUpdated:FireAllClients({ teamA = 0, teamB = 0 })
	end
end)
