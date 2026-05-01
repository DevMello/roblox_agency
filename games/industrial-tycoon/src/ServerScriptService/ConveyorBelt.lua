--!strict

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Constants = require(ReplicatedStorage:WaitForChild("Constants"))

-- Server-side authoritative conveyor movement driver.
-- Parts are moved via CFrame updates each Heartbeat tick (decision-2026-04-29-0001),
-- ensuring authoritative server positions for CashPad detection and future steal mechanics.

type PartState = {
	waypointIndex: number,
	progress: number,
}

-- Public interface returned by ConveyorBelt.new()
export type ConveyorBeltInstance = {
	AddPart: (part: BasePart) -> (),
	RemovePart: (part: BasePart) -> (),
	SetSpeed: (speed: number) -> (),
	OnPartArrived: (callback: (BasePart) -> ()) -> (),
}

local ConveyorBelt = {}

-- Creates a new conveyor controller for the given ordered waypoint chain.
-- speed is in studs per second.
function ConveyorBelt.new(segmentParts: { BasePart }, speed: number): ConveyorBeltInstance
	local segments = segmentParts
	local currentSpeed = speed
	local parts: { [BasePart]: PartState } = {}
	local onArrived: ((BasePart) -> ())? = nil

	local function tick(dt: number): ()
		local n = #segments
		local arrived: { BasePart } = {}

		for part, state in pairs(parts) do
			local moved = currentSpeed * dt
			-- Guard prevents infinite loop on degenerate zero-length segments
			local guard = 0

			while moved > 0 and guard <= n do
				guard += 1
				local wi = state.waypointIndex

				if wi >= n then
					-- Part has reached or passed the final waypoint
					part.CFrame = CFrame.new(segments[n].Position)
					table.insert(arrived, part)
					moved = 0
					break
				end

				local segA = segments[wi].Position
				local segB = segments[wi + 1].Position
				local segLen = (segB - segA).Magnitude

				if segLen < 0.001 then
					-- Degenerate segment: skip to next waypoint
					state.waypointIndex += 1
					continue
				end

				local remaining = segLen - state.progress
				if moved >= remaining then
					-- Part crosses into the next segment this tick
					moved -= remaining
					state.waypointIndex += 1
					state.progress = 0
				else
					state.progress += moved
					moved = 0
				end
			end

			-- Update CFrame for parts still on the belt
			local wi = state.waypointIndex
			if wi < n and table.find(arrived, part) == nil then
				local segA = segments[wi].Position
				local segB = segments[wi + 1].Position
				local segLen = (segB - segA).Magnitude
				if segLen > 0.001 then
					local alpha = math.clamp(state.progress / segLen, 0, 1)
					part.CFrame = CFrame.new(segA:Lerp(segB, alpha))
				end
			end
		end

		-- Process arrivals after iteration to avoid mutating parts during traversal
		for _, part in ipairs(arrived) do
			parts[part] = nil
			if onArrived then
				task.spawn(onArrived, part)
			end
			if Constants.DEBUG_MODE then
				print("ConveyorBelt: part arrived at final waypoint –", part.Name)
			end
		end
	end

	RunService.Heartbeat:Connect(tick)

	return {
		-- Registers a resource part to start moving from the first waypoint.
		AddPart = function(part: BasePart): ()
			if #segments == 0 then
				warn("ConveyorBelt: AddPart – no segments configured on this belt")
				return
			end
			part.CFrame = segments[1].CFrame
			parts[part] = { waypointIndex = 1, progress = 0 }
		end,

		-- Updates movement speed for all currently moving parts.
		SetSpeed = function(newSpeed: number): ()
			currentSpeed = newSpeed
		end,

		-- Deregisters a part (called when collected or forcibly removed).
		RemovePart = function(part: BasePart): ()
			parts[part] = nil
		end,

		-- Registers a callback invoked (via task.spawn) when a part reaches the final waypoint.
		OnPartArrived = function(callback: (BasePart) -> ()): ()
			onArrived = callback
		end,
	}
end

return ConveyorBelt
