--!strict
-- Megamap geometry builder script (it-005).
-- Run once in the Roblox Studio Command Bar (or via execute_luau) to rebuild the
-- Workspace/Map hierarchy from scratch. Idempotent: destroys and recreates Map.
--
-- Stud dimensions (per spec):
--   Total footprint : 1200 W (X) x 1200 D (Z)
--   Team A zone     : x in (-600, -50), width=550, center x=-325
--   Center strip    : x in (-50, +50),  width=100, center x=0
--   Team B zone     : x in (+50, +600), width=550, center x=+325
--   Ground Y        : top surface at y=0 (base Part thickness=1, at y=-0.5)
--   Territory walls : 2 W x 50 H x 1200 D, at x=-50 (TeamA) and x=+50 (TeamB)
--   SellDepot body  : 80 W x 30 H x 60 D, at (0, 15, 0)
--   SellDepot roof  : 86 W x 5 H x 66 D, at (0, 32.5, 0)
--   DepositZone     : 70 W x 1 H x 50 D, at (0, 0.5, 0), attr DepositZone=true
--   Entrance width  : 20 Z gap between pillars; lintel at 5H above gap top
--   Zone signs      : 60 W x 10 H x 4 D
--   Tint overlays   : 550 W x 0.2 H x 1200 D, Transparency=0.85, CanCollide=false

local workspace = game:GetService("Workspace")

local existing = workspace:FindFirstChild("Map")
if existing then existing:Destroy() end

local function makePart(name: string, parent: Instance, size: Vector3, cframe: CFrame,
	color: BrickColor, transparency: number, canCollide: boolean): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cframe
	p.BrickColor = color
	p.Transparency = transparency
	p.CanCollide = canCollide
	p.Anchored = true
	p.Parent = parent
	return p
end

local function makeFolder(name: string, parent: Instance): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent
	return f
end

local function makeZoneSign(zoneName: string, parent: Instance, position: Vector3): ()
	local sign = makePart(zoneName .. "Label", parent,
		Vector3.new(60, 10, 4), CFrame.new(position),
		BrickColor.new("Dark stone grey"), 0, false)
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.Parent = sign
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, 0, 1, 0)
	label.Text = string.upper(zoneName) .. " — COMING SOON"
	label.TextScaled = true
	label.BackgroundTransparency = 1
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Parent = gui
end

local Map = Instance.new("Folder")
Map.Name = "Map"
Map.Parent = workspace

-- Base ground (full 1200x1200)
makePart("BaseGround", Map, Vector3.new(1200, 1, 1200),
	CFrame.new(0, -0.5, 0), BrickColor.new("White"), 0, true)

-- Team A tint overlay
makePart("TeamATintOverlay", Map, Vector3.new(550, 0.2, 1200),
	CFrame.new(-325, 0.1, 0), BrickColor.new("Bright red"), 0.85, false)

-- Team B tint overlay
makePart("TeamBTintOverlay", Map, Vector3.new(550, 0.2, 1200),
	CFrame.new(325, 0.1, 0), BrickColor.new("Bright blue"), 0.85, false)

-- ── TEAM A ──────────────────────────────────────────────────────────────────
local TeamA = makeFolder("TeamA", Map)
makeFolder("LumberZone", TeamA)
local MineZoneA = makeFolder("MineZone", TeamA)
makeZoneSign("MineZone", MineZoneA, Vector3.new(-325, 15, 0))
local OilZoneA = makeFolder("OilZone", TeamA)
makeZoneSign("OilZone", OilZoneA, Vector3.new(-325, 15, 200))
makePart("TerritoryBorder", TeamA, Vector3.new(2, 50, 1200),
	CFrame.new(-50, 25, 0), BrickColor.new("Bright red"), 0, true)

-- ── TEAM B ──────────────────────────────────────────────────────────────────
local TeamB = makeFolder("TeamB", Map)
makeFolder("LumberZone", TeamB)
local MineZoneB = makeFolder("MineZone", TeamB)
makeZoneSign("MineZone", MineZoneB, Vector3.new(325, 15, 0))
local OilZoneB = makeFolder("OilZone", TeamB)
makeZoneSign("OilZone", OilZoneB, Vector3.new(325, 15, 200))
makePart("TerritoryBorder", TeamB, Vector3.new(2, 50, 1200),
	CFrame.new(50, 25, 0), BrickColor.new("Bright blue"), 0, true)

-- ── CENTER ──────────────────────────────────────────────────────────────────
local Center = makeFolder("Center", Map)
makePart("GroundPlane", Center, Vector3.new(100, 1, 1200),
	CFrame.new(0, 0, 0), BrickColor.new("Medium stone grey"), 0, true)

local SellDepot = Instance.new("Model")
SellDepot.Name = "SellDepot"
SellDepot.Parent = Center

local mainBody = makePart("WarehouseBody", SellDepot, Vector3.new(80, 30, 60),
	CFrame.new(0, 15, 0), BrickColor.new("Medium stone grey"), 0, true)
SellDepot.PrimaryPart = mainBody

makePart("Roof", SellDepot, Vector3.new(86, 5, 66),
	CFrame.new(0, 32.5, 0), BrickColor.new("Dark stone grey"), 0, true)

-- Entrance A framing (Team A side, x=-40)
makePart("EntranceA_PillarLeft",  SellDepot, Vector3.new(4, 30, 6), CFrame.new(-40, 15, -13), BrickColor.new("Dark stone grey"), 0, true)
makePart("EntranceA_PillarRight", SellDepot, Vector3.new(4, 30, 6), CFrame.new(-40, 15,  13), BrickColor.new("Dark stone grey"), 0, true)
makePart("EntranceA_Lintel",      SellDepot, Vector3.new(4,  5, 20), CFrame.new(-40, 27.5, 0), BrickColor.new("Dark stone grey"), 0, true)
makePart("EntranceA",             SellDepot, Vector3.new(4, 0.2, 20), CFrame.new(-40, 0.1, 0), BrickColor.new("Bright red"), 0.5, false)

-- Entrance B framing (Team B side, x=+40)
makePart("EntranceB_PillarLeft",  SellDepot, Vector3.new(4, 30, 6), CFrame.new(40, 15, -13), BrickColor.new("Dark stone grey"), 0, true)
makePart("EntranceB_PillarRight", SellDepot, Vector3.new(4, 30, 6), CFrame.new(40, 15,  13), BrickColor.new("Dark stone grey"), 0, true)
makePart("EntranceB_Lintel",      SellDepot, Vector3.new(4,  5, 20), CFrame.new(40, 27.5, 0), BrickColor.new("Dark stone grey"), 0, true)
makePart("EntranceB",             SellDepot, Vector3.new(4, 0.2, 20), CFrame.new(40, 0.1, 0), BrickColor.new("Bright blue"), 0.5, false)

-- DepositZone (glowing yellow plate, DepositZone attribute = true)
local dz = makePart("DepositZone", SellDepot, Vector3.new(70, 1, 50),
	CFrame.new(0, 0.5, 0), BrickColor.new("Bright yellow"), 0, true)
dz:SetAttribute("DepositZone", true)
local light = Instance.new("SurfaceLight")
light.Brightness = 2
light.Color = Color3.fromRGB(255, 215, 0)
light.Face = Enum.NormalId.Top
light.Range = 20
light.Parent = dz

return "Megamap built. Descendants: " .. #Map:GetDescendants()
