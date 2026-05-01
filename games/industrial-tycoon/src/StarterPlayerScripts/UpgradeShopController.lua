--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local localPlayer = Players.LocalPlayer
local playerGui = localPlayer:WaitForChild("PlayerGui")

local RemoteEventsFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local RemoteFunctionsFolder = ReplicatedStorage:WaitForChild("RemoteFunctions")

local MoneyUpdated = RemoteEventsFolder:WaitForChild("MoneyUpdated") :: RemoteEvent
local UpgradePurchased = RemoteEventsFolder:WaitForChild("UpgradePurchased") :: RemoteEvent
local RequestUpgradePurchase = RemoteFunctionsFolder:WaitForChild("RequestUpgradePurchase") :: RemoteFunction
local GetPlayerData = RemoteFunctionsFolder:WaitForChild("GetPlayerData") :: RemoteFunction
local BoostBucksUpdated = RemoteEventsFolder:WaitForChild("BoostBucksUpdated") :: RemoteEvent

local MAX_LEVEL = 5
local UPGRADE_COSTS: { [string]: { number } } = {
	speed  = { 100, 250, 500, 1000, 2000 },
	output = { 150, 350, 700, 1400, 2800 },
}

type MachineSpec = { name: string, suffix: string, upgrades: { string } }
local MACHINES: { MachineSpec } = {
	{ name = "Auto Chopper", suffix = "LumberZone.Machines.AutoChopper", upgrades = { "speed", "output" } },
	{ name = "Sawmill",      suffix = "LumberZone.Machines.Sawmill",     upgrades = { "speed", "output" } },
}

local panelOpen = false
local cachedMoney = 0
local cachedBoostBucks = 0
local cachedLevels: { [string]: { speed: number, output: number } } = {}

local moneyLabel: TextLabel
local boostBucksLabel: TextLabel
local errorLabel: TextLabel
local mainPanel: Frame
local cardFrames: { { machineId: string, speedBtn: TextButton, outputBtn: TextButton,
	speedBBBtn: TextButton, outputBBBtn: TextButton,
	speedLabel: TextLabel, outputLabel: TextLabel } } = {}

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

local function refreshCurrency(): ()
	if moneyLabel then moneyLabel.Text = "Money: " .. formatMoney(cachedMoney) end
	if boostBucksLabel then boostBucksLabel.Text = "Boost Bucks: " .. tostring(math.floor(cachedBoostBucks)) end
end

local function refreshCard(info: { machineId: string, speedBtn: TextButton,
	outputBtn: TextButton, speedBBBtn: TextButton, outputBBBtn: TextButton,
	speedLabel: TextLabel, outputLabel: TextLabel }): ()
	local mid = info.machineId
	local sLevel = levelOf(mid, "speed")
	local oLevel = levelOf(mid, "output")
	local sCost = costFor("speed", sLevel)
	local oCost = costFor("output", oLevel)

	info.speedLabel.Text = "Speed: " .. sLevel .. "/" .. MAX_LEVEL
	info.outputLabel.Text = "Output: " .. oLevel .. "/" .. MAX_LEVEL

	if sCost then
		info.speedBtn.Text = "Upgrade Speed\n" .. formatMoney(sCost)
		local canAfford = cachedMoney >= sCost
		info.speedBtn.BackgroundColor3 = canAfford and Color3.fromRGB(60,120,60) or Color3.fromRGB(80,80,80)
		info.speedBtn.AutoButtonColor = canAfford
	else
		info.speedBtn.Text = "Speed MAX"
		info.speedBtn.BackgroundColor3 = Color3.fromRGB(40,40,40)
		info.speedBtn.AutoButtonColor = false
	end

	if oCost then
		info.outputBtn.Text = "Upgrade Output\n" .. formatMoney(oCost)
		local canAfford = cachedMoney >= oCost
		info.outputBtn.BackgroundColor3 = canAfford and Color3.fromRGB(60,80,160) or Color3.fromRGB(80,80,80)
		info.outputBtn.AutoButtonColor = canAfford
	else
		info.outputBtn.Text = "Output MAX"
		info.outputBtn.BackgroundColor3 = Color3.fromRGB(40,40,40)
		info.outputBtn.AutoButtonColor = false
	end
	-- Boost Bucks secondary buttons (same upgrade cost in BB)
	if sCost then
		info.speedBBBtn.Text = "BB Speed\n" .. tostring(math.floor(sCost)) .. " BB"
		local canBB = cachedBoostBucks >= sCost
		info.speedBBBtn.BackgroundColor3 = canBB and Color3.fromRGB(0,140,100) or Color3.fromRGB(60,60,60)
		info.speedBBBtn.AutoButtonColor = canBB
	else
		info.speedBBBtn.Text = "BB MAX"
		info.speedBBBtn.BackgroundColor3 = Color3.fromRGB(40,40,40)
		info.speedBBBtn.AutoButtonColor = false
	end
	if oCost then
		info.outputBBBtn.Text = "BB Output\n" .. tostring(math.floor(oCost)) .. " BB"
		local canBB = cachedBoostBucks >= oCost
		info.outputBBBtn.BackgroundColor3 = canBB and Color3.fromRGB(0,80,160) or Color3.fromRGB(60,60,60)
		info.outputBBBtn.AutoButtonColor = canBB
	else
		info.outputBBBtn.Text = "BB MAX"
		info.outputBBBtn.BackgroundColor3 = Color3.fromRGB(40,40,40)
		info.outputBBBtn.AutoButtonColor = false
	end
end

local function refreshAll(): ()
	refreshCurrency()
	for _, info in ipairs(cardFrames) do refreshCard(info) end
end

local function fetchAndRefresh(): ()
	task.spawn(function()
		local ok, result = pcall(function() return GetPlayerData:InvokeServer() end)
		if not ok then
			if errorLabel then errorLabel.Text = "Could not load data" errorLabel.Visible = true end
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

local flashButton: (btn: TextButton, success: boolean) -> ()

local function onBuyBBPressed(mid: string, upgradeType: string, btn: TextButton): ()
	if errorLabel then errorLabel.Visible = false end
	task.spawn(function()
		local ok, result = pcall(function()
			return RequestUpgradePurchase:InvokeServer({ machineId = mid, upgradeType = upgradeType, payWithBoostBucks = true })
		end)
		if not ok then
			flashButton(btn, false)
			if errorLabel then errorLabel.Text = "BB request failed" errorLabel.Visible = true end
			return
		end
		local response = result :: { success: boolean, newLevel: number?, reason: string?, newBoostBucks: number? }
		if response.success then
			local newLevel = response.newLevel or 0
			if not cachedLevels[mid] then cachedLevels[mid] = { speed = 0, output = 0 } end
			if upgradeType == "speed" then cachedLevels[mid].speed = newLevel
			else cachedLevels[mid].output = newLevel end
			if response.newBoostBucks then
				cachedBoostBucks = response.newBoostBucks
			end
			flashButton(btn, true)
			refreshAll()
		else
			flashButton(btn, false)
			if errorLabel then
				errorLabel.Text = response.reason or "BB purchase failed"
				errorLabel.Visible = true
			end
		end
	end)
end

flashButton = function(btn: TextButton, success: boolean): ()
	local original = btn.BackgroundColor3
	btn.BackgroundColor3 = success and Color3.fromRGB(0,220,80) or Color3.fromRGB(220,60,60)
	task.delay(0.4, function() btn.BackgroundColor3 = original end)
end

local function onBuyPressed(mid: string, upgradeType: string, btn: TextButton): ()
	if errorLabel then errorLabel.Visible = false end
	task.spawn(function()
		local ok, result = pcall(function()
			return RequestUpgradePurchase:InvokeServer({ machineId = mid, upgradeType = upgradeType })
		end)
		if not ok then
			flashButton(btn, false)
			if errorLabel then errorLabel.Text = "Request failed" errorLabel.Visible = true end
			return
		end
		local response = result :: { success: boolean, newLevel: number?, reason: string? }
		if response.success then
			local newLevel = response.newLevel or 0
			if not cachedLevels[mid] then cachedLevels[mid] = { speed = 0, output = 0 } end
			if upgradeType == "speed" then cachedLevels[mid].speed = newLevel
			else cachedLevels[mid].output = newLevel end
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

local function buildGui(): ()
	local teamFolder = getTeamFolder()
	if not teamFolder then task.delay(2, buildGui) return end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "UpgradeShopGui"
	screenGui.ResetOnSpawn = false
	screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	screenGui.Parent = playerGui

	local toggleBtn = Instance.new("TextButton")
	toggleBtn.Size = UDim2.new(0,120,0,40)
	toggleBtn.Position = UDim2.new(1,-130,1,-50)
	toggleBtn.Text = "SHOP"
	toggleBtn.Font = Enum.Font.GothamBold
	toggleBtn.TextSize = 16
	toggleBtn.TextColor3 = Color3.fromRGB(255,255,255)
	toggleBtn.BackgroundColor3 = Color3.fromRGB(50,100,200)
	toggleBtn.BorderSizePixel = 0
	toggleBtn.Parent = screenGui
	Instance.new("UICorner", toggleBtn).CornerRadius = UDim.new(0,6)

	local panel = Instance.new("Frame")
	panel.Name = "MainPanel"
	panel.Size = UDim2.new(0,320,0,440)
	panel.Position = UDim2.new(1,-330,1,-60)
	panel.AnchorPoint = Vector2.new(0,1)
	panel.BackgroundColor3 = Color3.fromRGB(30,30,40)
	panel.BorderSizePixel = 0
	panel.Visible = false
	panel.Parent = screenGui
	mainPanel = panel
	Instance.new("UICorner", panel).CornerRadius = UDim.new(0,8)
	local pad = Instance.new("UIPadding", panel)
	pad.PaddingLeft = UDim.new(0,8)
	pad.PaddingRight = UDim.new(0,8)
	pad.PaddingTop = UDim.new(0,6)
	pad.PaddingBottom = UDim.new(0,6)
	local layout = Instance.new("UIListLayout", panel)
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0,6)

	local currencyBar = Instance.new("Frame")
	currencyBar.Size = UDim2.new(1,0,0,50)
	currencyBar.BackgroundColor3 = Color3.fromRGB(20,20,30)
	currencyBar.BorderSizePixel = 0
	currencyBar.LayoutOrder = 1
	currencyBar.Parent = panel
	Instance.new("UICorner", currencyBar).CornerRadius = UDim.new(0,6)

	local ml = Instance.new("TextLabel", currencyBar)
	ml.Size = UDim2.new(1,0,0.5,0)
	ml.Position = UDim2.new(0,8,0,0)
	ml.BackgroundTransparency = 1
	ml.TextColor3 = Color3.fromRGB(255,220,80)
	ml.Font = Enum.Font.GothamBold
	ml.TextSize = 14
	ml.TextXAlignment = Enum.TextXAlignment.Left
	ml.Text = "Money: $0"
	moneyLabel = ml

	local bbl = Instance.new("TextLabel", currencyBar)
	bbl.Size = UDim2.new(1,0,0.5,0)
	bbl.Position = UDim2.new(0,8,0.5,0)
	bbl.BackgroundTransparency = 1
	bbl.TextColor3 = Color3.fromRGB(140,200,255)
	bbl.Font = Enum.Font.Gotham
	bbl.TextSize = 12
	bbl.TextXAlignment = Enum.TextXAlignment.Left
	bbl.Text = "Boost Bucks: 0"
	boostBucksLabel = bbl

	local errLabel = Instance.new("TextLabel", panel)
	errLabel.Size = UDim2.new(1,0,0,20)
	errLabel.BackgroundTransparency = 1
	errLabel.TextColor3 = Color3.fromRGB(255,80,80)
	errLabel.Font = Enum.Font.Gotham
	errLabel.TextSize = 12
	errLabel.TextXAlignment = Enum.TextXAlignment.Left
	errLabel.Text = ""
	errLabel.Visible = false
	errLabel.LayoutOrder = 2
	errorLabel = errLabel

	for idx, spec in ipairs(MACHINES) do
		local mid = machineId(teamFolder, spec.suffix)
		local card = Instance.new("Frame", panel)
		card.Name = "Card_" .. spec.name:gsub(" ","")
		card.Size = UDim2.new(1,0,0,170)
		card.BackgroundColor3 = Color3.fromRGB(40,40,55)
		card.BorderSizePixel = 0
		card.LayoutOrder = idx + 2
		Instance.new("UICorner", card).CornerRadius = UDim.new(0,6)

		local nL = Instance.new("TextLabel", card)
		nL.Size = UDim2.new(1,0,0,22)
		nL.Position = UDim2.new(0,8,0,4)
		nL.BackgroundTransparency = 1
		nL.TextColor3 = Color3.fromRGB(255,255,255)
		nL.Font = Enum.Font.GothamBold
		nL.TextSize = 14
		nL.TextXAlignment = Enum.TextXAlignment.Left
		nL.Text = spec.name

		local sLL = Instance.new("TextLabel", card)
		sLL.Size = UDim2.new(0.5,-4,0,18)
		sLL.Position = UDim2.new(0,8,0,28)
		sLL.BackgroundTransparency = 1
		sLL.TextColor3 = Color3.fromRGB(200,200,200)
		sLL.Font = Enum.Font.Gotham
		sLL.TextSize = 12
		sLL.TextXAlignment = Enum.TextXAlignment.Left
		sLL.Text = "Speed: 0/5"

		local oLL = Instance.new("TextLabel", card)
		oLL.Size = UDim2.new(0.5,-4,0,18)
		oLL.Position = UDim2.new(0.5,0,0,28)
		oLL.BackgroundTransparency = 1
		oLL.TextColor3 = Color3.fromRGB(200,200,200)
		oLL.Font = Enum.Font.Gotham
		oLL.TextSize = 12
		oLL.TextXAlignment = Enum.TextXAlignment.Left
		oLL.Text = "Output: 0/5"

		local sBtn = Instance.new("TextButton", card)
		sBtn.Size = UDim2.new(0.5,-12,0,48)
		sBtn.Position = UDim2.new(0,4,0,54)
		sBtn.BackgroundColor3 = Color3.fromRGB(60,120,60)
		sBtn.TextColor3 = Color3.fromRGB(255,255,255)
		sBtn.Font = Enum.Font.Gotham
		sBtn.TextSize = 11
		sBtn.BorderSizePixel = 0
		sBtn.Text = "Upgrade Speed"
		Instance.new("UICorner", sBtn).CornerRadius = UDim.new(0,4)

		local oBtn = Instance.new("TextButton", card)
		oBtn.Size = UDim2.new(0.5,-12,0,48)
		oBtn.Position = UDim2.new(0.5,4,0,54)
		oBtn.BackgroundColor3 = Color3.fromRGB(60,80,160)
		oBtn.TextColor3 = Color3.fromRGB(255,255,255)
		oBtn.Font = Enum.Font.Gotham
		oBtn.TextSize = 11
		oBtn.BorderSizePixel = 0
		oBtn.Text = "Upgrade Output"
		Instance.new("UICorner", oBtn).CornerRadius = UDim.new(0,4)

		local sBBBtn = Instance.new("TextButton", card)
		sBBBtn.Size = UDim2.new(0.5,-12,0,46)
		sBBBtn.Position = UDim2.new(0,4,0,108)
		sBBBtn.BackgroundColor3 = Color3.fromRGB(0,140,100)
		sBBBtn.TextColor3 = Color3.fromRGB(255,255,255)
		sBBBtn.Font = Enum.Font.Gotham
		sBBBtn.TextSize = 10
		sBBBtn.BorderSizePixel = 0
		sBBBtn.Text = "BB Speed"
		Instance.new("UICorner", sBBBtn).CornerRadius = UDim.new(0,4)

		local oBBBtn = Instance.new("TextButton", card)
		oBBBtn.Size = UDim2.new(0.5,-12,0,46)
		oBBBtn.Position = UDim2.new(0.5,4,0,108)
		oBBBtn.BackgroundColor3 = Color3.fromRGB(0,80,160)
		oBBBtn.TextColor3 = Color3.fromRGB(255,255,255)
		oBBBtn.Font = Enum.Font.Gotham
		oBBBtn.TextSize = 10
		oBBBtn.BorderSizePixel = 0
		oBBBtn.Text = "BB Output"
		Instance.new("UICorner", oBBBtn).CornerRadius = UDim.new(0,4)

		local info = { machineId=mid, speedBtn=sBtn, outputBtn=oBtn, speedBBBtn=sBBBtn, outputBBBtn=oBBBtn, speedLabel=sLL, outputLabel=oLL }
		table.insert(cardFrames, info)
		local capturedMid = mid
		sBtn.MouseButton1Click:Connect(function() onBuyPressed(capturedMid,"speed",sBtn) end)
		oBtn.MouseButton1Click:Connect(function() onBuyPressed(capturedMid,"output",oBtn) end)
		sBBBtn.MouseButton1Click:Connect(function() onBuyBBPressed(capturedMid,"speed",sBBBtn) end)
		oBBBtn.MouseButton1Click:Connect(function() onBuyBBPressed(capturedMid,"output",oBBBtn) end)
	end

	toggleBtn.MouseButton1Click:Connect(function()
		panelOpen = not panelOpen
		panel.Visible = panelOpen
		toggleBtn.BackgroundColor3 = panelOpen and Color3.fromRGB(180,60,60) or Color3.fromRGB(50,100,200)
		if panelOpen then fetchAndRefresh() end
	end)
end

MoneyUpdated.OnClientEvent:Connect(function(data: { delta: number, total: number })
	cachedMoney = data.total or cachedMoney
	if panelOpen then refreshAll() end
end)

UpgradePurchased.OnClientEvent:Connect(function(data: {
	machineId: string, upgradeType: string, newLevel: number, purchasedBy: string
})
	if not cachedLevels[data.machineId] then cachedLevels[data.machineId] = { speed=0, output=0 } end
	if data.upgradeType == "speed" then cachedLevels[data.machineId].speed = data.newLevel
	else cachedLevels[data.machineId].output = data.newLevel end
	if panelOpen then refreshAll() end
end)

BoostBucksUpdated.OnClientEvent:Connect(function(data: { balance: number })
	cachedBoostBucks = data.balance or cachedBoostBucks
	if panelOpen then refreshAll() end
end)

task.spawn(function()
	local elapsed = 0
	while elapsed < 10 do
		if localPlayer.Team then break end
		task.wait(0.5)
		elapsed += 0.5
	end
	buildGui()
end)
