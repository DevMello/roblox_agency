--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local remoteEvents = ReplicatedStorage:WaitForChild("RemoteEvents")
local leaderboardUpdated = remoteEvents:WaitForChild("LeaderboardUpdated") :: RemoteEvent
local roundStateChanged = remoteEvents:WaitForChild("RoundStateChanged") :: RemoteEvent
local roundTimerTick = remoteEvents:WaitForChild("RoundTimerTick") :: RemoteEvent

local TEAM_A_COLOR = Color3.fromRGB(200, 50, 50)
local TEAM_B_COLOR = Color3.fromRGB(50, 100, 200)
local TWEEN_DURATION = 0.3

-- Build GUI inside the ScreenGui cloned from StarterGui
local screenGui = playerGui:WaitForChild("LeaderboardGui") :: ScreenGui

local mainFrame = Instance.new("Frame")
mainFrame.Name = "MainFrame"
mainFrame.Size = UDim2.new(0, 500, 0, 80)
mainFrame.Position = UDim2.new(0.5, -250, 0, 8)
mainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
mainFrame.BackgroundTransparency = 0.3
mainFrame.BorderSizePixel = 0
mainFrame.Parent = screenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 8)
mainCorner.Parent = mainFrame

-- Team A column (left, red accent)
local teamAFrame = Instance.new("Frame")
teamAFrame.Name = "TeamAFrame"
teamAFrame.Size = UDim2.new(0, 160, 1, 0)
teamAFrame.Position = UDim2.new(0, 0, 0, 0)
teamAFrame.BackgroundColor3 = TEAM_A_COLOR
teamAFrame.BackgroundTransparency = 0.5
teamAFrame.BorderSizePixel = 0
teamAFrame.Parent = mainFrame

local teamACorner = Instance.new("UICorner")
teamACorner.CornerRadius = UDim.new(0, 8)
teamACorner.Parent = teamAFrame

local teamANameLabel = Instance.new("TextLabel")
teamANameLabel.Name = "TeamName"
teamANameLabel.Size = UDim2.new(1, 0, 0.4, 0)
teamANameLabel.Position = UDim2.new(0, 0, 0, 0)
teamANameLabel.BackgroundTransparency = 1
teamANameLabel.Text = "TEAM A"
teamANameLabel.TextColor3 = Color3.fromRGB(255, 140, 140)
teamANameLabel.TextScaled = true
teamANameLabel.Font = Enum.Font.GothamBold
teamANameLabel.Parent = teamAFrame

local teamAWalletLabel = Instance.new("TextLabel")
teamAWalletLabel.Name = "WalletLabel"
teamAWalletLabel.Size = UDim2.new(1, 0, 0.6, 0)
teamAWalletLabel.Position = UDim2.new(0, 0, 0.4, 0)
teamAWalletLabel.BackgroundTransparency = 1
teamAWalletLabel.Text = "$0"
teamAWalletLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
teamAWalletLabel.TextScaled = true
teamAWalletLabel.Font = Enum.Font.Gotham
teamAWalletLabel.Parent = teamAFrame

-- Center panel (timer + state)
local centerFrame = Instance.new("Frame")
centerFrame.Name = "CenterFrame"
centerFrame.Size = UDim2.new(0, 160, 1, 0)
centerFrame.Position = UDim2.new(0.5, -80, 0, 0)
centerFrame.BackgroundTransparency = 1
centerFrame.BorderSizePixel = 0
centerFrame.Parent = mainFrame

local timerLabel = Instance.new("TextLabel")
timerLabel.Name = "TimerLabel"
timerLabel.Size = UDim2.new(1, 0, 0.5, 0)
timerLabel.Position = UDim2.new(0, 0, 0, 0)
timerLabel.BackgroundTransparency = 1
timerLabel.Text = "00:00"
timerLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
timerLabel.TextScaled = true
timerLabel.Font = Enum.Font.GothamBold
timerLabel.Parent = centerFrame

local stateLabel = Instance.new("TextLabel")
stateLabel.Name = "StateLabel"
stateLabel.Size = UDim2.new(1, 0, 0.5, 0)
stateLabel.Position = UDim2.new(0, 0, 0.5, 0)
stateLabel.BackgroundTransparency = 1
stateLabel.Text = "WAITING FOR PLAYERS"
stateLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
stateLabel.TextScaled = true
stateLabel.Font = Enum.Font.Gotham
stateLabel.Parent = centerFrame

-- Team B column (right, blue accent)
local teamBFrame = Instance.new("Frame")
teamBFrame.Name = "TeamBFrame"
teamBFrame.Size = UDim2.new(0, 160, 1, 0)
teamBFrame.Position = UDim2.new(1, -160, 0, 0)
teamBFrame.BackgroundColor3 = TEAM_B_COLOR
teamBFrame.BackgroundTransparency = 0.5
teamBFrame.BorderSizePixel = 0
teamBFrame.Parent = mainFrame

local teamBCorner = Instance.new("UICorner")
teamBCorner.CornerRadius = UDim.new(0, 8)
teamBCorner.Parent = teamBFrame

local teamBNameLabel = Instance.new("TextLabel")
teamBNameLabel.Name = "TeamName"
teamBNameLabel.Size = UDim2.new(1, 0, 0.4, 0)
teamBNameLabel.Position = UDim2.new(0, 0, 0, 0)
teamBNameLabel.BackgroundTransparency = 1
teamBNameLabel.Text = "TEAM B"
teamBNameLabel.TextColor3 = Color3.fromRGB(140, 180, 255)
teamBNameLabel.TextScaled = true
teamBNameLabel.Font = Enum.Font.GothamBold
teamBNameLabel.Parent = teamBFrame

local teamBWalletLabel = Instance.new("TextLabel")
teamBWalletLabel.Name = "WalletLabel"
teamBWalletLabel.Size = UDim2.new(1, 0, 0.6, 0)
teamBWalletLabel.Position = UDim2.new(0, 0, 0.4, 0)
teamBWalletLabel.BackgroundTransparency = 1
teamBWalletLabel.Text = "$0"
teamBWalletLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
teamBWalletLabel.TextScaled = true
teamBWalletLabel.Font = Enum.Font.Gotham
teamBWalletLabel.Parent = teamBFrame

-- Helpers
local function formatCurrency(amount: number): string
	local floored = math.floor(amount)
	local str = tostring(floored)
	local len = #str
	local result = ""
	for i = 1, len do
		local remaining = len - i
		if i > 1 and remaining % 3 == 0 then
			result ..= ","
		end
		result ..= str:sub(i, i)
	end
	return "$" .. result
end

local function formatTime(seconds: number): string
	local s = math.max(0, math.floor(seconds))
	return string.format("%02d:%02d", math.floor(s / 60), s % 60)
end

-- Tween a wallet label from fromVal to toVal over TWEEN_DURATION seconds
local function tweenWallet(label: TextLabel, fromVal: number, toVal: number): ()
	local proxy = Instance.new("NumberValue")
	proxy.Value = fromVal
	local tween = TweenService:Create(
		proxy,
		TweenInfo.new(TWEEN_DURATION, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ Value = toVal }
	)
	proxy.Changed:Connect(function(val: number)
		label.Text = formatCurrency(val)
	end)
	tween.Completed:Connect(function()
		label.Text = formatCurrency(toVal)
		proxy:Destroy()
	end)
	tween:Play()
end

local currentTeamA = 0
local currentTeamB = 0

leaderboardUpdated.OnClientEvent:Connect(function(data: { teamA: number, teamB: number })
	if typeof(data) ~= "table" then return end
	local newA = if typeof(data.teamA) == "number" then data.teamA else currentTeamA
	local newB = if typeof(data.teamB) == "number" then data.teamB else currentTeamB
	tweenWallet(teamAWalletLabel, currentTeamA, newA)
	tweenWallet(teamBWalletLabel, currentTeamB, newB)
	currentTeamA = newA
	currentTeamB = newB
end)

roundStateChanged.OnClientEvent:Connect(function(data: { state: string, winnerTeam: unknown, isTie: boolean })
	if typeof(data) ~= "table" then return end
	local state = if typeof(data.state) == "string" then data.state else ""
	if state == "waiting" then
		stateLabel.Text = "WAITING FOR PLAYERS"
		tweenWallet(teamAWalletLabel, currentTeamA, 0)
		tweenWallet(teamBWalletLabel, currentTeamB, 0)
		currentTeamA = 0
		currentTeamB = 0
	elseif state == "active" then
		stateLabel.Text = "ROUND IN PROGRESS"
	elseif state == "ended" then
		local isTie = data.isTie == true
		local winner = if typeof(data.winnerTeam) == "string" then data.winnerTeam else nil
		if isTie then
			stateLabel.Text = "IT'S A TIE!"
		elseif winner ~= nil then
			stateLabel.Text = string.upper(winner) .. " WINS!"
		else
			stateLabel.Text = "ROUND ENDED"
		end
	end
end)

roundTimerTick.OnClientEvent:Connect(function(seconds: number)
	if typeof(seconds) ~= "number" then return end
	timerLabel.Text = formatTime(seconds)
end)
