--!strict

local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants    = require(ReplicatedStorage:WaitForChild("Constants"))
local ConveyorBelt = require(ServerScriptService:WaitForChild("ConveyorBelt"))
local BeltRegistry = require(ServerScriptService:WaitForChild("BeltRegistry"))

-- Build one ConveyorBelt instance per team from ordered Conveyors folder and register it
local function buildBelts(): ()
	local map = workspace:WaitForChild("Map")

	for _, teamFolder in map:GetChildren() do
		local lz = teamFolder:FindFirstChild("LumberZone")
		if not lz then continue end

		local conveyors = lz:FindFirstChild("Conveyors")
		if not conveyors then continue end

		local segments: { BasePart } = {}
		for _, seg in conveyors:GetChildren() do
			if seg:IsA("BasePart") then
				table.insert(segments, seg)
			end
		end
		-- Sort ascending by X: Team A (-342..-200) correct order; Team B needs descending (+342..+200)
		table.sort(segments, function(a, b)
			return a.Position.X < b.Position.X
		end)
		if teamFolder.Name == "TeamB" then
			local reversed: { BasePart } = {}
			for i = #segments, 1, -1 do
				table.insert(reversed, segments[i])
			end
			segments = reversed
		end

		local belt = ConveyorBelt.new(segments, Constants.CONVEYOR_BASE_SPEED[1])
		BeltRegistry.Register(teamFolder.Name, belt)
	end
end

-- Walk up the instance hierarchy to find the team folder name ("TeamA" / "TeamB")
local function getTeamFolderName(inst: Instance): string?
	local current: Instance? = inst
	while current do
		if current.Parent and current.Parent.Name == "Map" then
			return current.Name
		end
		current = current.Parent
	end
	return nil
end

-- Per-player click cooldown: userId -> os.clock() of last accepted click
local cooldowns: { [number]: number } = {}

local function canClick(player: Player): boolean
	local now = os.clock()
	local last = cooldowns[player.UserId]
	if last and (now - last) < Constants.CLICK_COOLDOWN then
		return false
	end
	cooldowns[player.UserId] = now
	return true
end

Players.PlayerRemoving:Connect(function(player: Player)
	cooldowns[player.UserId] = nil
end)

local function setup()
	buildBelts()
	local map = workspace:WaitForChild("Map")

	for _, teamFolder in map:GetChildren() do
		local lz = teamFolder:FindFirstChild("LumberZone")
		if not lz then continue end
		local machines = lz:FindFirstChild("Machines")
		if not machines then continue end

		local chopper = machines:FindFirstChild("AutoChopper")
		local tree    = machines:FindFirstChild("Tree")
		local belt    = BeltRegistry.Get(teamFolder.Name)

		if not belt then
			warn("ChopperService: no belt found for " .. teamFolder.Name)
			continue
		end

		local function spawnLog(player: Player, source: BasePart)
			-- Server-side team validation: strip spaces to compare "TeamA" with "Team A"
			local machineTeam   = getTeamFolderName(source)
			local playerTeamRaw = player.Team and player.Team.Name or nil
			local playerTeam    = playerTeamRaw and playerTeamRaw:gsub(" ", "") or nil
			if playerTeam ~= machineTeam then
				if Constants.DEBUG_MODE then
					print("ChopperService: team mismatch — player on", playerTeamRaw, "tried chopper for", machineTeam)
				end
				return
			end

			if not canClick(player) then return end

			local outputPoint = source:FindFirstChild("OutputPoint")
			local spawnCFrame = outputPoint
				and CFrame.new((outputPoint :: Attachment).WorldPosition)
				or source.CFrame

			local log = Instance.new("Part")
			log.Name       = "Log"
			log.Size       = Vector3.new(2, 2, 4)
			log.Color      = Color3.fromRGB(139, 90, 43)
			log.Material   = Enum.Material.Wood
			log.Anchored   = false
			log.CanCollide = false
			log.CastShadow = false
			log:SetAttribute("ResourceType", "Log")
			log:SetAttribute("OwnerTeam", teamFolder.Name)
			log.CFrame = spawnCFrame
			log.Parent = workspace

			belt:AddPart(log)

			if Constants.DEBUG_MODE then
				print("ChopperService: spawned Log for", teamFolder.Name, "by", player.Name)
			end
		end

		if chopper then
			local cd = chopper:FindFirstChildOfClass("ClickDetector")
			if cd then
				(cd :: ClickDetector).MouseClick:Connect(function(player: Player)
					spawnLog(player, chopper :: BasePart)
				end)
			end
		end

		if tree then
			local cd = tree:FindFirstChildOfClass("ClickDetector")
			if cd then
				(cd :: ClickDetector).MouseClick:Connect(function(player: Player)
					spawnLog(player, tree :: BasePart)
				end)
			end
		end
	end
end

setup()
