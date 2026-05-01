--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))
local TeamService = require(ServerScriptService:WaitForChild("TeamService"))
local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))
local BeltRegistry = require(ServerScriptService:WaitForChild("BeltRegistry"))

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local MoneyUpdated = RemoteEventsFolder:WaitForChild("MoneyUpdated") :: RemoteEvent

-- Planks waiting at a CashPad: padName (team folder name) -> { BasePart }
local pendingParts: { [string]: { BasePart } } = {}

-- Guard against double-collection on the same part
local collecting: { [BasePart]: boolean } = {}

-- Walk the ancestor chain to find the owning team folder name ("TeamA" or "TeamB")
local function getPadTeam(instance: Instance): string?
	local ancestor: Instance? = instance.Parent
	while ancestor do
		local name = ancestor.Name
		if name == "TeamA" or name == "TeamB" then
			return name
		end
		ancestor = ancestor.Parent
	end
	return nil
end

-- Find the nearest online player within radius of a world position
local function nearestPlayer(position: Vector3, radius: number): Player?
	local closest: Player? = nil
	local closestDist = radius + 1
	for _, player in ipairs(Players:GetPlayers()) do
		local char = player.Character
		if char then
			local hrp = char:FindFirstChild("HumanoidRootPart") :: BasePart?
			if hrp then
				local dist = (hrp.Position - position).Magnitude
				if dist < closestDist then
					closestDist = dist
					closest = player
				end
			end
		end
	end
	return closest
end

-- Credit a player and their team wallet for a single resource part, then destroy it
local function creditAndDestroy(part: BasePart, player: Player, padTeam: string): ()
	if collecting[part] then return end
	collecting[part] = true

	local resourceType = part:GetAttribute("ResourceType") :: string?
	local value = (resourceType and Constants.RESOURCE_VALUE[resourceType]) or 0

	if value > 0 then
		PlayerDataService.AddMoney(player, value)
		MoneyUpdated:FireClient(player, {
			delta = value,
			total = PlayerDataService.GetData(player).money,
		})
		TeamService.AddToTeamWallet(padTeam, value)
	end

	part:Destroy()
	collecting[part] = nil
end

-- Public: collect all pending planks at a CashPad on behalf of a specific player.
-- Called by player walk-over and by VIP Worker NPC (it-023).
local CashPadService = {}

function CashPadService.CollectFromPad(pad: BasePart, player: Player): ()
	local padTeam = getPadTeam(pad)
	if not padTeam then return end

	local pending = pendingParts[padTeam]
	if not pending then return end

	-- Snapshot the list before iterating so concurrent removals are safe
	local snapshot = table.clone(pending)
	table.clear(pending)

	for _, part in ipairs(snapshot) do
		if part and part.Parent then
			creditAndDestroy(part, player, padTeam)
		end
	end
end

-- Called by the outbound belt's OnPartArrived: anchor the plank at the CashPad and
-- immediately collect it if a player is already standing nearby.
local function onPlankArrived(part: BasePart, cashPad: BasePart, padTeam: string): ()
	if not part or not part.Parent then return end

	-- Anchor the plank so it doesn't fall while waiting for a player
	part.Anchored = true
	part.CFrame = CFrame.new(cashPad.Position + Vector3.new(0, 0.5, 0))

	if not pendingParts[padTeam] then
		pendingParts[padTeam] = {}
	end
	table.insert(pendingParts[padTeam], part)

	-- Immediately collect if a player is within range
	local player = nearestPlayer(cashPad.Position, Constants.CASHPAD_COLLECT_RADIUS)
	if player then
		CashPadService.CollectFromPad(cashPad, player)
	end
end

-- Wire up one CashPad Part: Touched event for player walk-over collection
local function wireCashPad(cashPad: BasePart, padTeam: string): ()
	cashPad.Touched:Connect(function(hit: BasePart)
		if not hit or not hit.Parent then return end
		-- Only respond to player HumanoidRootPart touches
		if hit.Name ~= "HumanoidRootPart" then return end
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player then return end
		CashPadService.CollectFromPad(cashPad, player)
	end)
end

-- Discover all CashPads and wire outbound belt arrivals + player touch
local function setup(): ()
	local map = workspace:WaitForChild("Map")

	for _, teamFolder in map:GetChildren() do
		local lz = teamFolder:FindFirstChild("LumberZone")
		if not lz then continue end
		local machines = lz:FindFirstChild("Machines")
		if not machines then continue end

		local cashPad = machines:FindFirstChild("CashPad") :: BasePart?
		if not cashPad or not cashPad:IsA("BasePart") then
			warn("CashPadService: no CashPad found under", machines:GetFullName())
			continue
		end

		local padTeam = teamFolder.Name
		pendingParts[padTeam] = {}

		-- Register OnPartArrived on the outbound belt for this team
		local outBelt = BeltRegistry.Get(padTeam .. "_outbound")
		if outBelt then
			local pad = cashPad
			local team = padTeam
			outBelt:OnPartArrived(function(part: BasePart)
				onPlankArrived(part, pad, team)
			end)
		else
			warn("CashPadService: outbound belt not registered for team", padTeam, "— will retry in 2s")
			-- Retry once after a brief delay in case SawmillService hasn't registered yet
			task.delay(2, function()
				local belt = BeltRegistry.Get(padTeam .. "_outbound")
				if belt then
					local pad2 = cashPad
					local team2 = padTeam
					belt:OnPartArrived(function(part: BasePart)
						onPlankArrived(part, pad2, team2)
					end)
				else
					warn("CashPadService: outbound belt still missing for team", padTeam)
				end
			end)
		end

		-- Wire Touched for player walk-over (fires because HumanoidRootPart has CanCollide=true)
		wireCashPad(cashPad, padTeam)
	end
end

-- Wait for SawmillService to register outbound belts before wiring
task.delay(1, setup)

return CashPadService
