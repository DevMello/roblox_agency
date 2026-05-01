--!strict

local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants   = require(ReplicatedStorage:WaitForChild("Constants"))
local TeamService = require(ServerScriptService:WaitForChild("TeamService"))

-- Convert team folder name ("TeamA"/"TeamB") to team display name ("Team A"/"Team B")
local FOLDER_TO_TEAM: { [string]: string } = {
	TeamA = Constants.TEAM_NAMES[1],
	TeamB = Constants.TEAM_NAMES[2],
}

local remoteEvents = ReplicatedStorage:WaitForChild("RemoteEvents")
local depositEvent = remoteEvents:WaitForChild("SellDepotDeposited") :: RemoteEvent
local leaderEvent  = remoteEvents:WaitForChild("LeaderboardUpdated")  :: RemoteEvent

local function setup(): ()
	local map         = workspace:WaitForChild("Map")
	local center      = map:WaitForChild("Center")
	local sellDepot   = center:WaitForChild("SellDepot")
	local depositZone = sellDepot:WaitForChild("DepositZone") :: BasePart

	depositZone.Touched:Connect(function(hit: BasePart)
		local resourceType = hit:GetAttribute("ResourceType")
		if not resourceType then return end

		local ownerFolderName = hit:GetAttribute("OwnerTeam") :: string?
		if not ownerFolderName then return end

		local teamName = FOLDER_TO_TEAM[ownerFolderName]
		if not teamName then
			if Constants.DEBUG_MODE then
				print("SellDepotService: unknown OwnerTeam folder:", ownerFolderName)
			end
			return
		end

		local value = Constants.RESOURCE_VALUE[resourceType :: string] or 0
		if value <= 0 then return end

		hit:Destroy()

		TeamService.AddToTeamWallet(teamName, value)

		depositEvent:FireAllClients({
			teamName     = teamName,
			resourceType = resourceType,
			value        = value,
		})

		leaderEvent:FireAllClients({
			teamA = TeamService.GetTeamWallet(Constants.TEAM_NAMES[1]),
			teamB = TeamService.GetTeamWallet(Constants.TEAM_NAMES[2]),
		})

		if Constants.DEBUG_MODE then
			print("SellDepotService:", resourceType, "deposited by", ownerFolderName,
				"-> added", value, "to", teamName)
		end
	end)
end

setup()
