--!strict

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))

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

-- Save one player's data using UpdateAsync to prevent race conditions.
-- Retries up to 3 times with 2-second backoff on DataStore failure.
function PlayerDataService.SavePlayer(player: Player): ()
	local data = cache[cacheKey(player)]
	if not data then
		return
	end
	local key = Constants.DATASTORE_KEY_PREFIX .. tostring(player.UserId)
	local snapshot: PlayerData = data

	local attempts = 0
	while attempts < 3 do
		attempts += 1
		local ok, err = pcall(function()
			dataStore:UpdateAsync(key, function(_old: unknown): PlayerData
				return snapshot
			end)
		end)
		if ok then
			return
		end
		warn("PlayerDataService.SavePlayer: attempt " .. attempts .. " failed for " .. player.Name .. ": " .. tostring(err))
		if attempts < 3 then
			task.wait(2)
		end
	end
	warn("PlayerDataService.SavePlayer: all 3 attempts failed for " .. player.Name)
end

-- Save all currently online players concurrently.
function PlayerDataService.SaveAllPlayers(): ()
	for _, player in ipairs(Players:GetPlayers()) do
		task.spawn(PlayerDataService.SavePlayer, player)
	end
end

-- Save on leave, then clear from cache.
Players.PlayerRemoving:Connect(function(player: Player)
	PlayerDataService.SavePlayer(player)
	cache[cacheKey(player)] = nil
end)

-- Periodic auto-save every 5 minutes.
task.spawn(function()
	while true do
		task.wait(300)
		PlayerDataService.SaveAllPlayers()
	end
end)

-- Load data on join.
Players.PlayerAdded:Connect(function(player: Player)
	loadDataForPlayer(player)
end)

return PlayerDataService
