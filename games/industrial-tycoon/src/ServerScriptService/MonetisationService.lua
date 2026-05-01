--!strict

local MarketplaceService  = game:GetService("MarketplaceService")
local DataStoreService    = game:GetService("DataStoreService")
local Players             = game:GetService("Players")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Constants         = require(ReplicatedStorage:WaitForChild("Constants"))
local PlayerDataService = require(ServerScriptService:WaitForChild("PlayerDataService"))

-- DataStore for processed receipt IDs — prevents double-granting on rejoin
local receiptStore = DataStoreService:GetDataStore("ProcessedReceipts")

-- In-memory receipt cache for this server session: receiptId -> true
local processedThisSession: { [string]: boolean } = {}

local MonetisationService = {}

local function isReceiptProcessed(receiptId: string): boolean
	if processedThisSession[receiptId] then return true end
	local ok, result = pcall(function()
		return receiptStore:GetAsync(receiptId)
	end)
	return ok and result == true
end

local function markReceiptProcessed(receiptId: string): ()
	processedThisSession[receiptId] = true
	-- Best-effort persistence; do not block the purchase grant on a DataStore failure
	task.spawn(function()
		local ok, err = pcall(function()
			receiptStore:SetAsync(receiptId, true)
		end)
		if not ok then
			warn("MonetisationService: failed to persist receiptId", receiptId, "-", err)
		end
	end)
end

-- Route a developer product grant to the correct handler; returns true if granted
local function handleProductGrant(player: Player, productId: number): boolean
	-- Boost Bucks bundles — product IDs and amounts defined in Constants
	for i, pid in ipairs(Constants.BOOST_BUCKS_PRODUCT_IDS) do
		if pid == productId then
			local amount = Constants.BOOST_BUCKS_AMOUNTS[i] or 0
			PlayerDataService.AddBoostBucks(player, amount)

			local remoteEvents = ReplicatedStorage:FindFirstChild("RemoteEvents")
			if remoteEvents then
				local event = remoteEvents:FindFirstChild("BoostBucksUpdated") :: RemoteEvent?
				if event then
					event:FireClient(player, { balance = PlayerDataService.GetData(player).boostBucks })
				end
			end

			if Constants.DEBUG_MODE then
				print("MonetisationService: granted", amount, "Boost Bucks to", player.Name)
			end
			return true
		end
	end

	warn("MonetisationService: unrecognised productId", productId, "for player", player.Name)
	return false
end

-- ProcessReceipt is the authoritative developer product handler required by Roblox
local function processReceipt(
	info: { PlayerId: number, ProductId: number, PurchaseId: string, [string]: unknown }
): Enum.ProductPurchaseDecision
	local receiptId = tostring(info.PurchaseId)

	if isReceiptProcessed(receiptId) then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	local player = Players:GetPlayerByUserId(info.PlayerId)
	if not player then
		-- Player left mid-purchase; Roblox will retry on rejoin
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	if handleProductGrant(player, info.ProductId) then
		markReceiptProcessed(receiptId)
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	return Enum.ProductPurchaseDecision.NotProcessedYet
end

MarketplaceService.ProcessReceipt = processReceipt

-- Returns whether player owns a game pass; false on API error or unset pass IDs
function MonetisationService.CheckGamePass(player: Player, passId: number): boolean
	if passId == 0 then return false end
	local ok, owns = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passId)
	end)
	if not ok then
		warn("MonetisationService.CheckGamePass: API error for passId", passId, "-", owns)
		return false
	end
	return owns :: boolean
end

-- Explicit server-side product grant (for admin/test usage; bypasses receipt flow)
function MonetisationService.HandleDevProduct(player: Player, productId: number): ()
	handleProductGrant(player, productId)
end

return MonetisationService
