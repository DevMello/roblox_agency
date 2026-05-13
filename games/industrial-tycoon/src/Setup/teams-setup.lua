--!strict
-- One-time setup script: creates Team A and Team B in the Teams service
-- with colors matching Constants.TEAM_COLORS.
-- Run once via execute_luau or as a Script in ServerScriptService during initial setup.
-- Safe to re-run: skips creation if team already exists, corrects color if wrong.

local Teams = game:GetService("Teams")
local Constants = require(game:GetService("ReplicatedStorage"):WaitForChild("Constants"))

for _, teamName in Constants.TEAM_NAMES do
	local existing: Team? = nil
	for _, t in Teams:GetTeams() do
		if t.Name == teamName then
			existing = t
			break
		end
	end

	if existing then
		existing.TeamColor = Constants.TEAM_COLORS[teamName]
	else
		local team = Instance.new("Team")
		team.Name = teamName
		team.TeamColor = Constants.TEAM_COLORS[teamName]
		team.AutoAssignable = false -- TeamService handles assignment
		team.Parent = Teams
	end
end
