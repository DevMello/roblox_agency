# Prompt: Revenue Analysis

You are the Market Researcher agent. Analyse how the top Roblox games monetise.

---

## Step 1: Identify Monetisation Signals

For each of the top 20 games from the trending scan, navigate to the game's page and look for:

| Signal | Where to find it |
|--------|-----------------|
| Game passes | "Store" tab on the game page — any purchases labelled "Game Pass" |
| Developer products | "Store" tab — one-time or recurring purchases |
| VIP servers | "Servers" tab — if a private server option exists and has a price |
| Cosmetic systems | Game description mentions "skins", "cosmetics", "accessories", "customize" |
| Battle pass | Description or store mentions "battle pass", "season pass", "premium track" |

For each game, identify which monetisation types are present and the price range visible for game passes (if any).

---

## Step 2: Identify the Primary Model

For each game, classify its primary monetisation model:

| Model | Definition |
|-------|-----------|
| Cosmetic-only | Players can only buy cosmetic items; all gameplay is free |
| Pay-for-advantage | Passes or products give gameplay advantages (double XP, exclusive abilities) |
| VIP access | Core gameplay is gated behind a VIP pass purchase |
| Hybrid | Mix of cosmetic and pay-for-advantage items |
| Battle pass | Recurring seasonal progression pass |
| Free | No visible monetisation (or minimal) |

---

## Step 3: Estimate Revenue Tier

Use active player count as a proxy for revenue tier:

| Active players | Revenue tier estimate |
|---------------|----------------------|
| 50,000+ | Top 10% of Roblox games by revenue |
| 10,000–50,000 | Top 25% |
| 1,000–10,000 | Top 50% |
| Under 1,000 | Below median |

Note: these are rough estimates based on known Roblox economy patterns, not precise data.

---

## Step 4: Summarise Dominant Models

After analysing all 20 games, identify 3–5 dominant monetisation patterns across the top 20:
- What percentage of the top 20 use each model?
- Which model appears most in the top 5 (highest-traffic games)?
- Is any model notably underrepresented in the top 5 despite being common in games ranked 6–20?

---

## Step 5: Output

```
## Revenue Analysis
Date: {YYYY-MM-DD}

### Per-game monetisation

| Game | Primary model | Price range | Revenue tier | Notes |
|------|--------------|-------------|-------------|-------|
| ...  | ...          | ...         | ...         | ...   |

### Dominant models across top 20
1. {model}: {N}% of top 20
2. {model}: {N}% of top 20
3. {model}: {N}% of top 20

### Key finding
{2-3 sentences on what the monetisation data reveals about what players are currently willing to pay for}
```
