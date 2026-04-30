--!strict
-- Shared registry for ConveyorBelt instances. ChopperService registers belts here;
-- SawmillService and other consumers retrieve them by team folder name.

local BeltRegistry = {}

type BeltInstance = {
	AddPart: (part: BasePart) -> (),
	RemovePart: (part: BasePart) -> (),
	SetSpeed: (speed: number) -> (),
	OnPartArrived: (callback: (BasePart) -> ()) -> (),
}

local registry: { [string]: BeltInstance } = {}

function BeltRegistry.Register(teamFolderName: string, belt: BeltInstance): ()
	registry[teamFolderName] = belt
end

function BeltRegistry.Get(teamFolderName: string): BeltInstance?
	return registry[teamFolderName]
end

function BeltRegistry.GetAll(): { [string]: BeltInstance }
	return registry
end

return BeltRegistry
