--!strict

-- Handles GetPlayerData RemoteFunction invoked by the Upgrade Shop GUI (it-015).
-- Returns the player's current money, boostBucks, and upgrade levels.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))
local UpgradeStateService = require(ServerScriptService:WaitForChild("UpgradeStateService"))

local RemoteFunctionsFolder = ReplicatedStorage:WaitForChild("RemoteFunctions")
local GetPlayerData = RemoteFunctionsFolder:WaitForChild("GetPlayerData") :: RemoteFunction

GetPlayerData.OnServerInvoke = function(player: Player): { [string]: unknown }
	local data = PlayerDataService.GetData(player)
	local upgrades = UpgradeStateService.GetAllUpgrades()
	return {
		money = data.money,
		boostBucks = data.boostBucks,
		upgrades = upgrades,
	}
end
