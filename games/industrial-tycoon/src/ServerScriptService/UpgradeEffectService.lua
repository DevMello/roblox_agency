--!strict

local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants    = require(ReplicatedStorage:WaitForChild("Constants"))
local BeltRegistry = require(ServerScriptService:WaitForChild("BeltRegistry"))

-- Extract team folder name ("TeamA"/"TeamB") from a machineId path string
-- e.g. "Map.TeamA.LumberZone.Machines.AutoChopper" -> "TeamA"
local function teamFromMachineId(machineId: string): string?
	for _, teamName in Constants.TEAM_NAMES do
		local folderName = teamName:gsub(" ", "")
		if machineId:find(folderName, 1, true) then
			return folderName
		end
	end
	return nil
end

-- Resolve the Sawmill Part for a given team folder name
local function getSawmill(teamFolderName: string): BasePart?
	local map = workspace:FindFirstChild("Map")
	if not map then return nil end
	local teamFolder = map:FindFirstChild(teamFolderName)
	if not teamFolder then return nil end
	local lz = teamFolder:FindFirstChild("LumberZone")
	if not lz then return nil end
	local machines = lz:FindFirstChild("Machines")
	if not machines then return nil end
	return machines:FindFirstChild("Sawmill") :: BasePart?
end

local UpgradeEffectService = {}

-- Sets conveyor speed for the team associated with machineId.
-- Speed = CONVEYOR_BASE_SPEED[1] * SPEED_MULTIPLIER[level]
function UpgradeEffectService.ApplySpeedUpgrade(machineId: string, level: number): ()
	local teamFolderName = teamFromMachineId(machineId)
	if not teamFolderName then
		warn("UpgradeEffectService.ApplySpeedUpgrade: cannot resolve team from machineId:", machineId)
		return
	end

	local belt = BeltRegistry.Get(teamFolderName)
	if not belt then
		warn("UpgradeEffectService.ApplySpeedUpgrade: belt not registered for", teamFolderName)
		return
	end

	local multiplier = Constants.SPEED_MULTIPLIER[level] or 1.0
	local newSpeed   = Constants.CONVEYOR_BASE_SPEED[1] * multiplier
	belt:SetSpeed(newSpeed)

	if Constants.DEBUG_MODE then
		print("UpgradeEffectService: speed -> level", level, "=", newSpeed, "studs/s for", teamFolderName)
	end
end

-- Sets OutputMultiplier attribute on the team's Sawmill.
-- SawmillService reads this attribute to spawn N planks per log.
function UpgradeEffectService.ApplyOutputUpgrade(machineId: string, level: number): ()
	local teamFolderName = teamFromMachineId(machineId)
	if not teamFolderName then
		warn("UpgradeEffectService.ApplyOutputUpgrade: cannot resolve team from machineId:", machineId)
		return
	end

	local sawmill = getSawmill(teamFolderName)
	if not sawmill then
		warn("UpgradeEffectService.ApplyOutputUpgrade: Sawmill not found for", teamFolderName)
		return
	end

	local multiplier = Constants.OUTPUT_MULTIPLIER[level] or 1
	sawmill:SetAttribute("OutputMultiplier", multiplier)

	if Constants.DEBUG_MODE then
		print("UpgradeEffectService: output -> level", level, "= x", multiplier, "for", teamFolderName)
	end
end

return UpgradeEffectService
