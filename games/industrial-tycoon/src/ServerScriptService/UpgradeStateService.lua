--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))
local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))

-- Per-machine upgrade levels (round-scoped per decision-2026-04-29-0002).
-- Resets to 0 at round start; NOT persisted to DataStore as current levels.
-- Key: machine's full Workspace path, e.g. "Map.TeamA.LumberZone.Machines.AutoChopper"
local UpgradeState: { [string]: { speedLevel: number, outputLevel: number } } = {}

local UpgradeStateService = {}

-- Returns the current upgrade level for a machine and type ("speed" or "output").
-- Returns 0 if the machine has no entry (safe default).
function UpgradeStateService.GetUpgradeLevel(machineId: string, upgradeType: string): number
	local entry = UpgradeState[machineId]
	if not entry then
		return 0
	end
	if upgradeType == "speed" then
		return entry.speedLevel
	elseif upgradeType == "output" then
		return entry.outputLevel
	end
	return 0
end

-- Sets the upgrade level for a machine and type.
-- Level is clamped to [0, UPGRADE_MAX_LEVEL]. Creates the entry if absent.
function UpgradeStateService.SetUpgradeLevel(machineId: string, upgradeType: string, level: number): ()
	local clamped = math.clamp(level, 0, Constants.UPGRADE_MAX_LEVEL)
	if not UpgradeState[machineId] then
		UpgradeState[machineId] = { speedLevel = 0, outputLevel = 0 }
	end
	if upgradeType == "speed" then
		UpgradeState[machineId].speedLevel = clamped
	elseif upgradeType == "output" then
		UpgradeState[machineId].outputLevel = clamped
	end
end

-- Returns a shallow copy of the entire UpgradeState table.
-- Used by the upgrade shop GUI to render current levels on open.
function UpgradeStateService.GetAllUpgrades(): { [string]: { speedLevel: number, outputLevel: number } }
	local copy: { [string]: { speedLevel: number, outputLevel: number } } = {}
	for machineId, entry in pairs(UpgradeState) do
		copy[machineId] = { speedLevel = entry.speedLevel, outputLevel = entry.outputLevel }
	end
	return copy
end

-- Clears all upgrade levels. Called by Round Manager at round start.
function UpgradeStateService.ResetAllUpgrades(): ()
	table.clear(UpgradeState)
	if Constants.DEBUG_MODE then
		print("UpgradeStateService: all upgrade levels reset")
	end
end

-- Records a purchase in the player's DataStore history (analytics only).
-- The in-memory UpgradeState remains the authoritative runtime state.
function UpgradeStateService.RecordPurchase(
	player: Player,
	machineId: string,
	upgradeType: string,
	newLevel: number
): ()
	PlayerDataService.SetUpgradeLevel(player, machineId, newLevel)
	if Constants.DEBUG_MODE then
		print("UpgradeStateService: RecordPurchase –", player.Name, machineId, upgradeType, newLevel)
	end
end

return UpgradeStateService
