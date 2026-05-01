--!strict

local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants    = require(ReplicatedStorage:WaitForChild("Constants"))
local ConveyorBelt = require(ServerScriptService:WaitForChild("ConveyorBelt"))
local BeltRegistry = require(ServerScriptService:WaitForChild("BeltRegistry"))

-- Per-Sawmill outbound belt registry: teamFolderName -> ConveyorBeltInstance
local outboundBelts: { [string]: any } = {}

-- FIFO log queue per Sawmill (keyed by teamFolderName)
local logQueues:  { [string]: { BasePart } } = {}
local processing: { [string]: boolean }      = {}

local function processQueue(teamName: string): ()
	if processing[teamName] then return end

	local queue = logQueues[teamName]
	if not queue or #queue == 0 then return end

	processing[teamName] = true

	task.spawn(function()
		while logQueues[teamName] and #logQueues[teamName] > 0 do
			local log = table.remove(logQueues[teamName], 1)
			if log and log.Parent then
				log:Destroy()
			end

			task.wait(Constants.SAWMILL_PROCESS_TIME)

			-- Spawn Plank at PlankOutput for this team
			local map = workspace:FindFirstChild("Map")
			if not map then break end
			local teamFolder = map:FindFirstChild(teamName)
			if not teamFolder then break end
			local lz = teamFolder:FindFirstChild("LumberZone")
			if not lz then break end
			local machines = lz:FindFirstChild("Machines")
			if not machines then break end
			local sawmill = machines:FindFirstChild("Sawmill")
			if not sawmill then break end
			local plankOutput = sawmill:FindFirstChild("PlankOutput")
			if not plankOutput then break end

			local plank = Instance.new("Part")
			plank.Name       = "Plank"
			plank.Size       = Vector3.new(1, 0.5, 3)
			plank.Color      = Color3.fromRGB(222, 188, 153)
			plank.Material   = Enum.Material.Wood
			plank.Anchored   = false
			plank.CanCollide = false
			plank.CastShadow = false
			plank:SetAttribute("ResourceType", "Plank")
			plank:SetAttribute("OwnerTeam", teamName)
			plank.CFrame = (plankOutput :: BasePart).CFrame
			plank.Parent = workspace

			local outBelt = outboundBelts[teamName]
			if outBelt then
				outBelt:AddPart(plank)
			end

			if Constants.DEBUG_MODE then
				print("SawmillService: spawned Plank for", teamName)
			end
		end
		processing[teamName] = false
	end)
end

-- Build outbound belt (PlankOutput -> CashPad) and wire inbound belt arrival callback
local function setup()
	-- Wait briefly for ChopperService to register inbound belts in BeltRegistry
	task.wait(0.5)

	local map = workspace:WaitForChild("Map")

	for _, teamFolder in map:GetChildren() do
		local lz = teamFolder:FindFirstChild("LumberZone")
		if not lz then continue end
		local machines = lz:FindFirstChild("Machines")
		if not machines then continue end

		local sawmill     = machines:FindFirstChild("Sawmill")
		local cashPad     = machines:FindFirstChild("CashPad")

		if not sawmill then continue end

		local plankOutput = sawmill:FindFirstChild("PlankOutput")

		if not plankOutput or not cashPad then
			warn("SawmillService: missing PlankOutput or CashPad for " .. teamFolder.Name)
			continue
		end

		-- Outbound belt: 2-waypoint path from PlankOutput to CashPad
		local outBelt = ConveyorBelt.new(
			{ plankOutput :: BasePart, cashPad :: BasePart },
			Constants.CONVEYOR_BASE_SPEED[1]
		)
		outboundBelts[teamFolder.Name] = outBelt
		logQueues[teamFolder.Name]     = {}
		processing[teamFolder.Name]    = false

		-- Register outbound belt so UpgradeEffectService can set speed
		BeltRegistry.Register(teamFolder.Name .. "_outbound", outBelt)

		-- Wire inbound belt arrival callback → Sawmill FIFO queue
		local inBelt = BeltRegistry.Get(teamFolder.Name)
		if not inBelt then
			warn("SawmillService: inbound belt not registered for " .. teamFolder.Name)
			continue
		end

		local tName = teamFolder.Name
		inBelt:OnPartArrived(function(part: BasePart)
			if part:GetAttribute("ResourceType") == "Log" then
				table.insert(logQueues[tName], part)
				processQueue(tName)
			else
				part:Destroy()
			end
		end)
	end
end

setup()
