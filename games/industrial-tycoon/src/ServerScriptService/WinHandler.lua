--!strict

local DataStoreService    = game:GetService("DataStoreService")
local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Teams               = game:GetService("Teams")

local Constants         = require(ReplicatedStorage:WaitForChild("Constants"))
local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local BonusDropFired     = RemoteEventsFolder:WaitForChild("BonusDropFired") :: RemoteEvent

-- Regular DataStore for round records (OrderedDataStore only supports integer values;
-- a regular DataStore is used here to preserve full wallet totals per round).
local roundHistoryStore = DataStoreService:GetDataStore(Constants.ROUND_HISTORY_DATASTORE)

local WinHandler = {}

local function awardWinners(winnerTeamName: string): ()
	local team = Teams:FindFirstChild(winnerTeamName) :: Team?
	if not team then
		warn("WinHandler: winning team not found in Teams service:", winnerTeamName)
		return
	end
	for _, player in ipairs(team:GetPlayers()) do
		local data = PlayerDataService.GetData(player)
		data.cosmetic_tickets = data.cosmetic_tickets + 1
		BonusDropFired:FireClient(player, {
			rewardType = "cosmetic_ticket",
			amount = 1,
		})
	end
end

local function logRoundResult(winnerTeam: string?, teamAWallet: number, teamBWallet: number): ()
	local key = tostring(os.time())
	local record = {
		winnerTeam  = winnerTeam or "tie",
		teamAWallet = teamAWallet,
		teamBWallet = teamBWallet,
		timestamp   = os.time(),
	}
	local ok, err = pcall(function()
		roundHistoryStore:SetAsync(key, record)
	end)
	if not ok then
		warn("WinHandler: failed to log round result:", tostring(err))
	end
end

-- Called by RoundManager at end of each round with the resolved winner (nil = tie)
-- and final wallet totals for both teams.
function WinHandler.HandleRoundEnd(
	winnerTeam: string?,
	teamAWallet: number,
	teamBWallet: number
): ()
	if winnerTeam then
		awardWinners(winnerTeam)
	end
	-- Best-effort async log — does not block round reset on failure
	task.spawn(logRoundResult, winnerTeam, teamAWallet, teamBWallet)
end

return WinHandler
