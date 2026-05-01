--!strict

local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants           = require(ReplicatedStorage:WaitForChild("Constants"))
local PlayerDataService   = require(ServerScriptService:WaitForChild("PlayerDataService"))
local UpgradeStateService = require(ServerScriptService:WaitForChild("UpgradeStateService"))
local UpgradeEffectService = require(ServerScriptService:WaitForChild("UpgradeEffectService"))

local RemoteEventsFolder    = ReplicatedStorage:WaitForChild("RemoteEvents")
local RemoteFunctionsFolder = ReplicatedStorage:WaitForChild("RemoteFunctions")

local UpgradePurchased       = RemoteEventsFolder:WaitForChild("UpgradePurchased") :: RemoteEvent
local RequestUpgradePurchase = RemoteFunctionsFolder:WaitForChild("RequestUpgradePurchase") :: RemoteFunction

type PurchaseResult = { success: boolean, newLevel: number?, newBoostBucks: number?, reason: string? }

local function teamFolderFromMachineId(machineId: string): string?
	for _, teamName in Constants.TEAM_NAMES do
		local folderName = teamName:gsub(" ", "")
		if machineId:find(folderName, 1, true) then
			return folderName
		end
	end
	return nil
end

local function playerTeamFolder(player: Player): string?
	local team = player.Team
	if not team then return nil end
	return (team.Name :: string):gsub(" ", "")
end

local function handlePurchase(player: Player, args: { [string]: unknown }): PurchaseResult
	local machineId      = args.machineId      :: string?
	local upgradeType    = args.upgradeType    :: string?
	local payWithBoostBucks = args.payWithBoostBucks :: boolean?

	if not machineId or not upgradeType then
		return { success = false, reason = "invalid arguments" }
	end
	if upgradeType ~= "speed" and upgradeType ~= "output" then
		return { success = false, reason = "unknown upgradeType: " .. upgradeType }
	end

	-- 1. Team ownership check
	local machineTeam = teamFolderFromMachineId(machineId)
	local playerTeam  = playerTeamFolder(player)
	if not machineTeam or not playerTeam or machineTeam ~= playerTeam then
		return { success = false, reason = "team mismatch" }
	end

	-- 2. Level cap check
	local currentLevel = UpgradeStateService.GetUpgradeLevel(machineId, upgradeType)
	if currentLevel >= Constants.UPGRADE_MAX_LEVEL then
		return { success = false, reason = "already at max level" }
	end

	-- 3. Cost lookup
	local costTable = Constants.UPGRADE_COSTS[upgradeType]
	local cost = costTable and costTable[currentLevel + 1]
	if not cost then
		return { success = false, reason = "no cost defined for level " .. tostring(currentLevel + 1) }
	end

	-- 4. Funds check (money or Boost Bucks path)
	local data = PlayerDataService.GetData(player)
	if payWithBoostBucks then
		if data.boostBucks < cost then
			return { success = false, reason = "insufficient_boost_bucks" }
		end
		PlayerDataService.SpendBoostBucks(player, cost)
	else
		if data.money < cost then
			return { success = false, reason = "insufficient funds" }
		end
		PlayerDataService.AddMoney(player, -cost)
	end

	-- 5. Apply upgrade
	local newLevel = currentLevel + 1
	UpgradeStateService.SetUpgradeLevel(machineId, upgradeType, newLevel)
	UpgradeStateService.RecordPurchase(player, machineId, upgradeType, newLevel)

	if upgradeType == "speed" then
		UpgradeEffectService.ApplySpeedUpgrade(machineId, newLevel)
	else
		UpgradeEffectService.ApplyOutputUpgrade(machineId, newLevel)
	end

	-- 6. Notify all clients on the purchasing team
	local teamObj = player.Team
	if teamObj then
		for _, p in ipairs(Players:GetPlayers()) do
			if p.Team == teamObj then
				UpgradePurchased:FireClient(p, {
					machineId   = machineId,
					upgradeType = upgradeType,
					newLevel    = newLevel,
					purchasedBy = player.Name,
				})
			end
		end
	end

	local result: PurchaseResult = { success = true, newLevel = newLevel }
	if payWithBoostBucks then
		result.newBoostBucks = PlayerDataService.GetData(player).boostBucks
	end
	return result
end

RequestUpgradePurchase.OnServerInvoke = function(player: Player, args: unknown): PurchaseResult
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
