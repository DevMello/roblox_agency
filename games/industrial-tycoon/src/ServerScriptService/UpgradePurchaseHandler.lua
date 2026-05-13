--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))
local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))
local UpgradeStateService = require(ServerScriptService:WaitForChild("UpgradeStateService"))
local UpgradeEffectService = require(ServerScriptService:WaitForChild("UpgradeEffectService"))

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local RemoteFunctionsFolder = ReplicatedStorage:WaitForChild("RemoteFunctions")

local UpgradePurchased = RemoteEventsFolder:WaitForChild("UpgradePurchased") :: RemoteEvent
local RequestUpgradePurchase = RemoteFunctionsFolder:WaitForChild("RequestUpgradePurchase") :: RemoteFunction

type PurchaseResult = { success: boolean, newLevel: number?, reason: string? }

-- Derive the team folder name ("TeamA" or "TeamB") from a machineId path string
local function teamFolderFromMachineId(machineId: string): string?
	for _, teamName in Constants.TEAM_NAMES do
		local folderName = teamName:gsub(" ", "")
		if machineId:find(folderName, 1, true) then
			return folderName
		end
	end
	return nil
end

-- Return the team folder name for the player's assigned Roblox team ("Team A" → "TeamA")
local function playerTeamFolder(player: Player): string?
	local team = player.Team
	if not team then return nil end
	return (team.Name :: string):gsub(" ", "")
end

-- All-server-side validation and grant
local function handlePurchase(player: Player, args: { [string]: unknown }): PurchaseResult
	-- Validate argument shape
	local machineId = args.machineId :: string?
	local upgradeType = args.upgradeType :: string?
	if not machineId or not upgradeType then
		return { success = false, reason = "invalid arguments" }
	end
	if upgradeType ~= "speed" and upgradeType ~= "output" then
		return { success = false, reason = "unknown upgradeType: " .. upgradeType }
	end

	-- 1. Player team matches machine team
	local machineTeam = teamFolderFromMachineId(machineId)
	local playerTeam = playerTeamFolder(player)
	if not machineTeam or not playerTeam or machineTeam ~= playerTeam then
		return { success = false, reason = "team mismatch" }
	end

	-- 2. Current level is below max
	local currentLevel = UpgradeStateService.GetUpgradeLevel(machineId, upgradeType)
	if currentLevel >= Constants.UPGRADE_MAX_LEVEL then
		return { success = false, reason = "already at max level" }
	end

	-- 3. Player has sufficient funds
	local costTable = Constants.UPGRADE_COSTS[upgradeType]
	local cost = costTable and costTable[currentLevel + 1]
	if not cost then
		return { success = false, reason = "no cost defined for level " .. tostring(currentLevel + 1) }
	end

	local data = PlayerDataService.GetData(player)
	if data.money < cost then
		return { success = false, reason = "insufficient funds" }
	end

	-- All checks passed — apply the purchase
	local newLevel = currentLevel + 1

	PlayerDataService.AddMoney(player, -cost)
	UpgradeStateService.SetUpgradeLevel(machineId, upgradeType, newLevel)
	UpgradeStateService.RecordPurchase(player, machineId, upgradeType, newLevel)

	if upgradeType == "speed" then
		UpgradeEffectService.ApplySpeedUpgrade(machineId, newLevel)
	else
		UpgradeEffectService.ApplyOutputUpgrade(machineId, newLevel)
	end

	-- Notify all clients on the purchasing team
	local teamObj = player.Team
	if teamObj then
		for _, p in ipairs(Players:GetPlayers()) do
			if p.Team == teamObj then
				UpgradePurchased:FireClient(p, {
					machineId = machineId,
					upgradeType = upgradeType,
					newLevel = newLevel,
					purchasedBy = player.Name,
				})
			end
		end
	end

	return { success = true, newLevel = newLevel }
end

RequestUpgradePurchase.OnServerInvoke = function(player: Player, args: unknown): PurchaseResult
	-- Server-side argument validation: args must be a table
	if type(args) ~= "table" then
		return { success = false, reason = "invalid request format" }
	end
	local ok, result = pcall(handlePurchase, player, args :: { [string]: unknown })
	if not ok then
		warn("UpgradePurchaseHandler: unexpected error for", player.Name, tostring(result))
		return { success = false, reason = "server error" }
	end
	return result
end
