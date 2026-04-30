-- it-006: Lumber zone machine asset placement script
-- Run via execute_luau in Roblox Studio to place all Lumber zone instances
-- on both team halves. Script is idempotent — destroys previous Machines/Conveyors
-- folders before rebuilding, so rerunning is safe.
--
-- Final world positions (Team A / Team B mirrored):
--   Tree:           x = ±350,  y = 10,    z = 0
--   AutoChopper:    x = ±342,  y = 4,     z = 0   (OutputPoint offset ∓3 local x)
--   Conveyor segs:  x = ±338 → ±202 (18 × 8-stud parts, y=0.25)
--   Sawmill:        x = ±200,  y = 7.5,   z = 0
--     LogInput:     x = ±210,  y = 0.25   (intake/conveyor face)
--     PlankOutput:  x = ±190,  y = 0.25   (output/CashPad face)
--   CashPad:        x = ±185,  y = 0.25,  z = 0

local Workspace = game:GetService("Workspace")
local RS = game:GetService("ReplicatedStorage")
local Constants = require(RS:WaitForChild("Constants"))

local map = Workspace:FindFirstChild("Map")
if not map then return "ERROR: Map not found" end

local teamDefs = {
	{ folder = map:FindFirstChild("TeamA"), xSign = -1, teamKey = "Team A" },
	{ folder = map:FindFirstChild("TeamB"), xSign =  1, teamKey = "Team B" },
}

local results = {}

for _, td in ipairs(teamDefs) do
	if not td.folder then
		table.insert(results, "ERROR: " .. td.teamKey .. " folder not found")
		continue
	end

	local lz = td.folder:FindFirstChild("LumberZone")
	if not lz then
		table.insert(results, "ERROR: LumberZone not found under " .. td.teamKey)
		continue
	end

	-- Idempotent: clear prior assets
	local oldM = lz:FindFirstChild("Machines")
	if oldM then oldM:Destroy() end
	local oldC = lz:FindFirstChild("Conveyors")
	if oldC then oldC:Destroy() end

	local x = td.xSign
	local teamColor = Constants.TEAM_COLORS[td.teamKey]

	-- ── Machines folder ─────────────────────────────────────────────────────
	local machinesFolder = Instance.new("Folder")
	machinesFolder.Name = "Machines"
	machinesFolder.Parent = lz

	-- 1. Tree (log source) — 4×20×4, sits on ground (center y=10)
	local tree = Instance.new("Part")
	tree.Name = "Tree"
	tree.Size = Vector3.new(4, 20, 4)
	tree.Position = Vector3.new(x * 350, 10, 0)
	tree.Anchored = true
	tree.CanCollide = true
	tree.BrickColor = BrickColor.new("Reddish brown")
	tree.Material = Enum.Material.Wood
	tree.Parent = machinesFolder
	local treeCD = Instance.new("ClickDetector")
	treeCD.MaxActivationDistance = 10
	treeCD.Parent = tree

	-- 2. AutoChopper — 6×8×6, center y=4
	local chopper = Instance.new("Part")
	chopper.Name = "AutoChopper"
	chopper.Size = Vector3.new(6, 8, 6)
	chopper.Position = Vector3.new(x * 342, 4, 0)
	chopper.Anchored = true
	chopper.CanCollide = true
	chopper.BrickColor = teamColor
	chopper.Material = Enum.Material.SmoothPlastic
	chopper.Parent = machinesFolder
	local chopperCD = Instance.new("ClickDetector")
	chopperCD.MaxActivationDistance = 10
	chopperCD.Parent = chopper
	-- OutputPoint attachment: local offset toward center (+x for TeamA, -x for TeamB)
	local outputAtt = Instance.new("Attachment")
	outputAtt.Name = "OutputPoint"
	outputAtt.Position = Vector3.new(x * -3, 0, 0)
	outputAtt.Parent = chopper

	-- 3. Sawmill — 20×15×20 warehouse block
	local sawmill = Instance.new("Part")
	sawmill.Name = "Sawmill"
	sawmill.Size = Vector3.new(20, 15, 20)
	sawmill.Position = Vector3.new(x * 200, 7.5, 0)
	sawmill.Anchored = true
	sawmill.CanCollide = true
	sawmill.BrickColor = BrickColor.new("Medium stone grey")
	sawmill.Material = Enum.Material.SmoothPlastic
	sawmill.Parent = machinesFolder
	-- LogInput at intake face (conveyor-side), IsLogInput attribute
	local logInput = Instance.new("Part")
	logInput.Name = "LogInput"
	logInput.Size = Vector3.new(4, 0.5, 4)
	logInput.Position = Vector3.new(x * 210, 0.25, 0)
	logInput.Anchored = true
	logInput.CanCollide = false
	logInput.BrickColor = BrickColor.new("Bright green")
	logInput.Material = Enum.Material.Neon
	logInput.Transparency = 0.5
	logInput:SetAttribute("IsLogInput", true)
	logInput.Parent = sawmill
	-- PlankOutput at output face (CashPad-side), IsPlankOutput attribute
	local plankOutput = Instance.new("Part")
	plankOutput.Name = "PlankOutput"
	plankOutput.Size = Vector3.new(4, 0.5, 4)
	plankOutput.Position = Vector3.new(x * 190, 0.25, 0)
	plankOutput.Anchored = true
	plankOutput.CanCollide = false
	plankOutput.BrickColor = BrickColor.new("Bright yellow")
	plankOutput.Material = Enum.Material.Neon
	plankOutput.Transparency = 0.5
	plankOutput:SetAttribute("IsPlankOutput", true)
	plankOutput.Parent = sawmill

	-- 4. CashPad — 8×0.5×8 Neon yellow trigger
	local cashPad = Instance.new("Part")
	cashPad.Name = "CashPad"
	cashPad.Size = Vector3.new(8, 0.5, 8)
	cashPad.Position = Vector3.new(x * 185, 0.25, 0)
	cashPad.Anchored = true
	cashPad.CanCollide = false
	cashPad.BrickColor = BrickColor.new("Bright yellow")
	cashPad.Material = Enum.Material.Neon
	cashPad:SetAttribute("IsCashPad", true)
	cashPad.Parent = machinesFolder

	-- ── Conveyors folder ─────────────────────────────────────────────────────
	local conveyorsFolder = Instance.new("Folder")
	conveyorsFolder.Name = "Conveyors"
	conveyorsFolder.Parent = lz

	-- 18 segments of 8×0.5×4 studs covering from AutoChopper to Sawmill
	-- Team A: x = -338, -330, ..., -202 | Team B: x = 338, 330, ..., 202
	local SEG_COUNT = 18
	for i = 1, SEG_COUNT do
		local seg = Instance.new("Part")
		seg.Name = "ConveyorSegment"
		seg.Size = Vector3.new(8, 0.5, 4)
		seg.Position = Vector3.new(x * (338 - (i - 1) * 8), 0.25, 0)
		seg.Anchored = true
		seg.CanCollide = true
		seg.BrickColor = teamColor
		seg.Material = Enum.Material.SmoothPlastic
		seg:SetAttribute("IsConveyorSegment", true)
		seg.Parent = conveyorsFolder
	end

	table.insert(results, td.teamKey .. ": placed " .. SEG_COUNT .. " segments + 4 machines + CashPad")
end

return table.concat(results, "\n")
