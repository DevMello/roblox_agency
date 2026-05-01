--!strict

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))

-- Canonical player data schema
type PlayerData = {
	money: number,
	boostBucks: number,
	upgradesPurchased: { [string]: number },
	cosmeticsOwned: { [string]: boolean },
	cosmetic_tickets: number,
}

local function defaultSchema(): PlayerData
	return {
		money = 0,
		boostBucks = 0,
		upgradesPurchased = {},
		cosmeticsOwned = {},
		cosmetic_tickets = 0,
	}
end

local function mergeWithDefaults(loaded: { [string]: unknown }): PlayerData
	local defaults = defaultSchema()
	local merged: PlayerData = defaults
	if typeof(loaded.money) == "number" then merged.money = loaded.money :: number end
	if typeof(loaded.boostBucks) == "number" then merged.boostBucks = loaded.boostBucks :: number end
	if typeof(loaded.upgradesPurchased) == "table" then
		merged.upgradesPurchased = loaded.upgradesPurchased :: { [string]: number }
	end
	if typeof(loaded.cosmeticsOwned) == "table" then
		merged.cosmeticsOwned = loaded.cosmeticsOwned :: { [string]: boolean }
	end
	if typeof(loaded.cosmetic_tickets) == "number" then
		merged.cosmetic_tickets = loaded.cosmetic_tickets :: number
	end
	return merged
end

local dataStore = DataStoreService:GetDataStore(Constants.DATASTORE_NAME)

-- In-memory cache: player UserId (as string) -> PlayerData
local cache: { [string]: PlayerData } = {}

local PlayerDataService = {}

local function cacheKey(player: Player): string
	return tostring(player.UserId)
end

local function loadDataForPlayer(player: Player): ()
	local key = Constants.DATASTORE_KEY_PREFIX .. tostring(player.UserId)
	local loaded: { [string]: unknown }? = nil
	local attempts = 0

	while attempts < 3 do
		attempts += 1
		local ok, result = pcall(function()
			return dataStore:GetAsync(key)
		end)
		if ok then
			if result ~= nil then
				loaded = result :: { [string]: unknown }
			end
			break
		else
			warn("PlayerDataService: DataStore load attempt " .. attempts .. " failed for " .. tostring(player.UserId) .. ": " .. tostring(result))
			if attempts < 3 then
				task.wait(2)
			end
		end
	end

	if loaded ~= nil then
		cache[cacheKey(player)] = mergeWithDefaults(loaded)
	else
		if attempts >= 3 then
			warn("PlayerDataService: DataStore load failed for " .. tostring(player.UserId) .. " — using defaults")
		end
		cache[cacheKey(player)] = defaultSchema()
	end
end

-- Public API (server-side only)

function PlayerDataService.GetData(player: Player): PlayerData
	return cache[cacheKey(player)] or defaultSchema()
end

function PlayerDataService.SetMoney(player: Player, amount: number): ()
	local data = cache[cacheKey(player)]
	if data then
		data.money = amount
	end
end

function PlayerDataService.AddMoney(player: Player, delta: number): ()
	local data = cache[cacheKey(player)]
	if data then
		data.money = data.money + delta
	end
end

function PlayerDataService.GetUpgradeLevel(player: Player, machineId: string): number
	local data = cache[cacheKey(player)]
	if data then
		return data.upgradesPurchased[machineId] or 0
	end
	return 0
end

function PlayerDataService.SetUpgradeLevel(player: Player, machineId: string, level: number): ()
	local data = cache[cacheKey(player)]
	if data then
		data.upgradesPurchased[machineId] = level
	end
end

function PlayerDataService.AddBoostBucks(player: Player, amount: number): ()
	local data = cache[cacheKey(player)]
	if data then
		data.boostBucks = data.boostBucks + amount
	end
end

function PlayerDataService.SpendBoostBucks(player: Player, amount: number): boolean
	local data = cache[cacheKey(player)]
	if data and data.boostBucks >= amount then
		data.boostBucks = data.boostBucks - amount
		return true
	end
	return false
end

-- Load data on join
Players.PlayerAdded:Connect(function(player: Player)
	loadDataForPlayer(player)
end)

-- Remove from cache on leave (save is triggered by it-019)
Players.PlayerRemoving:Connect(function(player: Player)
	cache[cacheKey(player)] = nil
end)

return PlayerDataService
