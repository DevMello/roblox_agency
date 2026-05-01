--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local RemoteFunctionsFolder = ReplicatedStorage:WaitForChild("RemoteFunctions")

local MoneyUpdated = RemoteEventsFolder:WaitForChild("MoneyUpdated") :: RemoteEvent
local UpgradePurchased = RemoteEventsFolder:WaitForChild("UpgradePurchased") :: RemoteEvent
local RequestUpgradePurchase = RemoteFunctionsFolder:WaitForChild("RequestUpgradePurchase") :: RemoteFunction
local GetPlayerData = RemoteFunctionsFolder:WaitForChild("GetPlayerData") :: RemoteFunction

-- ── Constants ──────────────────────────────────────────────────────────────

local MAX_LEVEL = 5
local UPGRADE_COSTS: { [string]: { number } } = {
	speed  = { 100, 250, 500, 1000, 2000 },
	output = { 150, 350, 700, 1400, 2800 },
}

-- Machines shown per team (machineId suffix after team folder)
type MachineSpec = { name: string, suffix: string, upgrades: { string } }
local MACHINES: { MachineSpec } = {
	{ name = "Auto Chopper", suffix = "LumberZone.Machines.AutoChopper", upgrades = { "speed", "output" } },
	{ name = "Sawmill",      suffix = "LumberZone.Machines.Sawmill",     upgrades = { "speed", "output" } },
}

-- ── GUI State ──────────────────────────────────────────────────────────────

local panelOpen = false
local cachedMoney = 0
local cachedBoostBucks = 0

-- upgrade level cache keyed by machineId then upgradeType
local cachedLevels: { [string]: { speed: number, output: number } } = {}

-- UI element references updated on refresh
local moneyLabel: TextLabel
local boostBucksLabel: TextLabel
local errorLabel: TextLabel
local mainPanel: Frame
local cardFrames: { { machineId: string, speedBtn: TextButton, outputBtn: TextButton,
	speedLabel: TextLabel, outputLabel: TextLabel } } = {}

-- ── Helpers ────────────────────────────────────────────────────────────────

local function getTeamFolder(): string?
	local team = localPlayer.Team
	if not team then return nil end
	return (team.Name :: string):gsub(" ", "")
end

local function machineId(teamFolder: string, suffix: string): string
	return "Map." .. teamFolder .. "." .. suffix
end

local function levelOf(mid: string, upgradeType: string): number
	local entry = cachedLevels[mid]
	if not entry then return 0 end
	if upgradeType == "speed" then return entry.speed end
	return entry.output
end

local function costFor(upgradeType: string, currentLevel: number): number?
	if currentLevel >= MAX_LEVEL then return nil end
	local tbl = UPGRADE_COSTS[upgradeType]
	return tbl and tbl[currentLevel + 1]
end

local function formatMoney(n: number): string
	return "$" .. tostring(math.floor(n))
end

-- ── UI Update ──────────────────────────────────────────────────────────────

local function refreshCurrency(): ()
	if moneyLabel then
		moneyLabel.Text = "Money: " .. formatMoney(cachedMoney)
	end
	if boostBucksLabel then
		boostBucksLabel.Text = "Boost Bucks: " .. tostring(math.floor(cachedBoostBucks))
	end
end

local function refreshCard(info: { machineId: string, speedBtn: TextButton,
	outputBtn: TextButton, speedLabel: TextLabel, outputLabel: TextLabel }): ()
	local mid = info.machineId

	local sLevel = levelOf(mid, "speed")
	local oCost  = costFor("output", levelOf(mid, "output"))
	local sCost  = costFor("speed", sLevel)
	local oLevel = levelOf(mid, "output")

	info.speedLabel.Text = "Speed: " .. sLevel .. "/" .. MAX_LEVEL
	info.outputLabel.Text = "Output: " .. oLevel .. "/" .. MAX_LEVEL

	-- Speed button
	if sCost then
		info.speedBtn.Text = "Upgrade Speed\n" .. formatMoney(sCost)
		local canAfford = cachedMoney >= sCost
		info.speedBtn.BackgroundColor3 = canAfford
			and Color3.fromRGB(60, 120, 60)
			or Color3.fromRGB(80, 80, 80)
		info.speedBtn.AutoButtonColor = canAfford
	else
		info.speedBtn.Text = "Speed MAX"
		info.speedBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
		info.speedBtn.AutoButtonColor = false
	end

	-- Output button
	if oCost then
		info.outputBtn.Text = "Upgrade Output\n" .. formatMoney(oCost)
		local canAfford = cachedMoney >= oCost
		info.outputBtn.BackgroundColor3 = canAfford
			and Color3.fromRGB(60, 80, 160)
			or Color3.fromRGB(80, 80, 80)
		info.outputBtn.AutoButtonColor = canAfford
	else
		info.outputBtn.Text = "Output MAX"
		info.outputBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
		info.outputBtn.AutoButtonColor = false
	end
end

local function refreshAll(): ()
	refreshCurrency()
	for _, info in ipairs(cardFrames) do
		refreshCard(info)
	end
end

-- ── Data Fetch ─────────────────────────────────────────────────────────────

local function fetchAndRefresh(): ()
	task.spawn(function()
		local ok, result = pcall(function()
			return GetPlayerData:InvokeServer()
		end)
		if not ok then
			if errorLabel then
				errorLabel.Text = "Could not load data"
				errorLabel.Visible = true
			end
			return
		end
		local data = result :: { [string]: unknown }
		cachedMoney = (data.money :: number?) or 0
		cachedBoostBucks = (data.boostBucks :: number?) or 0

		local upgrades = data.upgrades :: { [string]: { speedLevel: number, outputLevel: number } }?
		if upgrades then
			for mid, entry in pairs(upgrades) do
				cachedLevels[mid] = { speed = entry.speedLevel, output = entry.outputLevel }
			end
		end

		refreshAll()
	end)
end

-- ── Buy Handler ────────────────────────────────────────────────────────────

local function flashButton(btn: TextButton, success: boolean): ()
	local original = btn.BackgroundColor3
	btn.BackgroundColor3 = success
		and Color3.fromRGB(0, 220, 80)
		or Color3.fromRGB(220, 60, 60)
	task.delay(0.4, function()
		btn.BackgroundColor3 = original
	end)
end

local function onBuyPressed(mid: string, upgradeType: string, btn: TextButton): ()
	if errorLabel then
		errorLabel.Visible = false
	end

	task.spawn(function()
		local ok, result = pcall(function()
			return RequestUpgradePurchase:InvokeServer({ machineId = mid, upgradeType = upgradeType })
		end)

		if not ok then
			flashButton(btn, false)
			if errorLabel then
				errorLabel.Text = "Request failed"
				errorLabel.Visible = true
			end
			return
		end

		local response = result :: { success: boolean, newLevel: number?, reason: string? }

		if response.success then
			local newLevel = response.newLevel or 0
			if not cachedLevels[mid] then
				cachedLevels[mid] = { speed = 0, output = 0 }
			end
			if upgradeType == "speed" then
				cachedLevels[mid].speed = newLevel
			else
				cachedLevels[mid].output = newLevel
			end
			flashButton(btn, true)
			refreshAll()
		else
			flashButton(btn, false)
			if errorLabel then
				errorLabel.Text = response.reason or "Purchase failed"
				errorLabel.Visible = true
			end
		end
	end)
end

-- ── GUI Construction ───────────────────────────────────────────────────────

local function buildGui(): ()
	local teamFolder = getTeamFolder()
	if not teamFolder then
		task.delay(2, buildGui)
		return
	end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "UpgradeShopGui"
	screenGui.ResetOnSpawn = false
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	screenGui.Parent = playerGui

	-- Toggle button (bottom-right)
	local toggleBtn = Instance.new("TextButton")
	toggleBtn.Name = "ToggleBtn"
	toggleBtn.Size = UDim2.new(0, 120, 0, 40)
	toggleBtn.Position = UDim2.new(1, -130, 1, -50)
	toggleBtn.AnchorPoint = Vector2.new(0, 0)
	toggleBtn.Text = "SHOP"
	toggleBtn.Font = Enum.Font.GothamBold
	toggleBtn.TextSize = 16
	toggleBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
	toggleBtn.BackgroundColor3 = Color3.fromRGB(50, 100, 200)
	toggleBtn.BorderSizePixel = 0
	toggleBtn.Parent = screenGui
	Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0, 6)

	-- Main panel (above toggle)
	local panel = Instance.new("Frame")
	panel.Name = "MainPanel"
	panel.Size = UDim2.new(0, 320, 0, 0)  -- height set after building cards
	panel.Position = UDim2.new(1, -330, 1, -60)
	panel.AnchorPoint = Vector2.new(0, 1)
	panel.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	panel.BorderSizePixel = 0
	panel.Visible = false
	panel.Parent = screenGui
	mainPanel = panel
	Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 8)
	Instance.new("UIPadding", panel).PaddingLeft = UDim.new(0, 8)

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 6)
	layout.Parent = panel

	-- Currency bar
	local currencyBar = Instance.new("Frame")
	currencyBar.Name = "CurrencyBar"
	currencyBar.Size = UDim2.new(1, -16, 0, 50)
	currencyBar.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
	currencyBar.BorderSizePixel = 0
	currencyBar.LayoutOrder = 1
	currencyBar.Parent = panel
	Instance.new("UICorner", currencyBar).CornerRadius = UDim.new(0, 6)

	local ml = Instance.new("TextLabel")
	ml.Name = "MoneyLabel"
	ml.Size = UDim2.new(1, 0, 0.5, 0)
	ml.Position = UDim2.new(0, 8, 0, 0)
	ml.BackgroundTransparency = 1
	ml.TextColor3 = Color3.fromRGB(255, 220, 80)
	ml.Font = Enum.Font.GothamBold
	ml.TextSize = 14
	ml.TextXAlignment = Enum.TextXAlignment.Left
	ml.Text = "Money: $0"
	ml.Parent = currencyBar
	moneyLabel = ml

	local bbl = Instance.new("TextLabel")
	bbl.Name = "BoostBucksLabel"
	bbl.Size = UDim2.new(1, 0, 0.5, 0)
	bbl.Position = UDim2.new(0, 8, 0.5, 0)
	bbl.BackgroundTransparency = 1
	bbl.TextColor3 = Color3.fromRGB(140, 200, 255)
	bbl.Font = Enum.Font.Gotham
	bbl.TextSize = 12
	bbl.TextXAlignment = Enum.TextXAlignment.Left
	bbl.Text = "Boost Bucks: 0"
	bbl.Parent = currencyBar
	boostBucksLabel = bbl

	-- Error text
	local errLabel = Instance.new("TextLabel")
	errLabel.Name = "ErrorLabel"
	errLabel.Size = UDim2.new(1, -16, 0, 22)
	errLabel.BackgroundTransparency = 1
	errLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
	errLabel.Font = Enum.Font.Gotham
	errLabel.TextSize = 12
	errLabel.TextXAlignment = Enum.TextXAlignment.Left
	errLabel.Text = ""
	errLabel.Visible = false
	errLabel.LayoutOrder = 2
	errLabel.Parent = panel
	errorLabel = errLabel

	-- Machine cards
	for idx, spec in ipairs(MACHINES) do
		local mid = machineId(teamFolder, spec.suffix)

		local card = Instance.new("Frame")
		card.Name = "Card_" .. spec.name:gsub(" ", "")
		card.Size = UDim2.new(1, -16, 0, 110)
		card.BackgroundColor3 = Color3.fromRGB(40, 40, 55)
		card.BorderSizePixel = 0
		card.LayoutOrder = idx + 2
		card.Parent = panel
		Instance.new("UICorner", card).CornerRadius = UDim.new(0, 6)

		local nameLabel = Instance.new("TextLabel")
		nameLabel.Size = UDim2.new(1, 0, 0, 22)
		nameLabel.Position = UDim2.new(0, 8, 0, 4)
		nameLabel.BackgroundTransparency = 1
		nameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
		nameLabel.Font = Enum.Font.GothamBold
		nameLabel.TextSize = 14
		nameLabel.TextXAlignment = Enum.TextXAlignment.Left
		nameLabel.Text = spec.name
		nameLabel.Parent = card

		local sLevelLbl = Instance.new("TextLabel")
		sLevelLbl.Size = UDim2.new(0.5, -4, 0, 18)
		sLevelLbl.Position = UDim2.new(0, 8, 0, 28)
		sLevelLbl.BackgroundTransparency = 1
		sLevelLbl.TextColor3 = Color3.fromRGB(200, 200, 200)
		sLevelLbl.Font = Enum.Font.Gotham
		sLevelLbl.TextSize = 12
		sLevelLbl.TextXAlignment = Enum.TextXAlignment.Left
		sLevelLbl.Text = "Speed: 0/5"
		sLevelLbl.Parent = card

		local oLevelLbl = Instance.new("TextLabel")
		oLevelLbl.Size = UDim2.new(0.5, -4, 0, 18)
		oLevelLbl.Position = UDim2.new(0.5, 0, 0, 28)
		oLevelLbl.BackgroundTransparency = 1
		oLevelLbl.TextColor3 = Color3.fromRGB(200, 200, 200)
		oLevelLbl.Font = Enum.Font.Gotham
		oLevelLbl.TextSize = 12
		oLevelLbl.TextXAlignment = Enum.TextXAlignment.Left
		oLevelLbl.Text = "Output: 0/5"
		oLevelLbl.Parent = card

		local sBtn = Instance.new("TextButton")
		sBtn.Size = UDim2.new(0.5, -12, 0, 48)
		sBtn.Position = UDim2.new(0, 4, 0, 54)
		sBtn.BackgroundColor3 = Color3.fromRGB(60, 120, 60)
		sBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
		sBtn.Font = Enum.Font.Gotham
		sBtn.TextSize = 11
		sBtn.BorderSizePixel = 0
		sBtn.Text = "Upgrade Speed"
		sBtn.Parent = card
		Instance.new("UICorner", sBtn).CornerRadius = UDim.new(0, 4)

		local oBtn = Instance.new("TextButton")
		oBtn.Size = UDim2.new(0.5, -12, 0, 48)
		oBtn.Position = UDim2.new(0.5, 4, 0, 54)
		oBtn.BackgroundColor3 = Color3.fromRGB(60, 80, 160)
		oBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
		oBtn.Font = Enum.Font.Gotham
		oBtn.TextSize = 11
		oBtn.BorderSizePixel = 0
		oBtn.Text = "Upgrade Output"
		oBtn.Parent = card
		Instance.new("UICorner", oBtn).CornerRadius = UDim.new(0, 4)

		local info = {
			machineId = mid,
			speedBtn = sBtn,
			outputBtn = oBtn,
			speedLabel = sLevelLbl,
			outputLabel = oLevelLbl,
		}
		table.insert(cardFrames, info)

		local capturedMid = mid
		sBtn.MouseButton1Click:Connect(function()
			onBuyPressed(capturedMid, "speed", sBtn)
		end)
		oBtn.MouseButton1Click:Connect(function()
			onBuyPressed(capturedMid, "output", oBtn)
		end)
	end

	-- Adjust panel height to fit content
	local totalHeight = layout.AbsoluteContentSize.Y + 16
	panel.Size = UDim2.new(0, 320, 0, math.max(totalHeight, 200))

	-- Toggle logic
	toggleBtn.MouseButton1Click:Connect(function()
		panelOpen = not panelOpen
		panel.Visible = panelOpen
		toggleBtn.BackgroundColor3 = panelOpen
			and Color3.fromRGB(180, 60, 60)
			or Color3.fromRGB(50, 100, 200)
		if panelOpen then
			fetchAndRefresh()
		end
	end)
end

-- ── Remote Event Listeners ─────────────────────────────────────────────────

MoneyUpdated.OnClientEvent:Connect(function(data: { delta: number, total: number })
	cachedMoney = data.total or cachedMoney
	if panelOpen then
		refreshAll()
	end
end)

UpgradePurchased.OnClientEvent:Connect(function(data: {
	machineId: string,
	upgradeType: string,
	newLevel: number,
	purchasedBy: string,
})
	if not cachedLevels[data.machineId] then
		cachedLevels[data.machineId] = { speed = 0, output = 0 }
	end
	if data.upgradeType == "speed" then
		cachedLevels[data.machineId].speed = data.newLevel
	else
		cachedLevels[data.machineId].output = data.newLevel
	end
	if panelOpen then
		refreshAll()
	end
end)

-- Wait for team assignment before building (player may spawn before team is set)
task.spawn(function()
	local maxWait = 10
	local elapsed = 0
	while elapsed < maxWait do
		if localPlayer.Team then
			break
		end
		task.wait(0.5)
		elapsed += 0.5
	end
	buildGui()
end)
