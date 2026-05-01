--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- RemoteEvents
local remoteEventsFolder = Instance.new("Folder")
remoteEventsFolder.Name = "RemoteEvents"
remoteEventsFolder.Parent = ReplicatedStorage

local remoteEventNames = {
	"MoneyUpdated",
	"TeamWalletUpdated",
	"RoundStateChanged",
	"RoundTimerTick",
	"UpgradePurchased",
	"LeaderboardUpdated",
	"SellDepotDeposited",
	"BonusDropFired",
	"BoostBucksUpdated",
}

for _, name in remoteEventNames do
	local event = Instance.new("RemoteEvent")
	event.Name = name
	event.Parent = remoteEventsFolder
end

-- RemoteFunctions
local remoteFunctionsFolder = Instance.new("Folder")
remoteFunctionsFolder.Name = "RemoteFunctions"
remoteFunctionsFolder.Parent = ReplicatedStorage

local remoteFunctionNames = {
	"RequestUpgradePurchase",
	"GetPlayerData",
}

for _, name in remoteFunctionNames do
	local fn = Instance.new("RemoteFunction")
	fn.Name = name
	fn.Parent = remoteFunctionsFolder
end
