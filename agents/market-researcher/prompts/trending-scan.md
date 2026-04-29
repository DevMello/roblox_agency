# Prompt: Trending Scan

You are the Market Researcher agent. Scrape and analyse the current Roblox top games charts.

---

## Step 1: Navigate to the Charts

Via Chrome MCP:
```
navigate("https://www.roblox.com/charts")
```

If the charts page is unavailable or requires login, try:
```
navigate("https://www.roblox.com/discover")
```

Scroll to load all visible game cards. Extract the top 20 games visible on the page.

---

## Step 2: Extract Data Per Game

For each of the top 20 games, extract:

| Field | How to find it |
|-------|---------------|
| Game name | Title visible on the card |
| Genre | Genre tag or category visible on the page |
| Active players | "Playing" count visible on the card |
| Monthly visits | Visit count from the game detail page (navigate to each game's page) |
| Approximate age | Publication date or "created" date from the game detail page |
| Trend direction | Compare to last week's data if available in `reports/weekly/market-research/` — up/flat/down |

For games where navigating to the detail page is too slow (over 15 seconds), record what is visible on the card and mark monthly visits and age as "not retrieved".

---

## Step 3: Identify Trending Patterns

After collecting all 20 games:

**Newly trending vs incumbents:**
- A game is newly trending if it appears in this week's top 20 but was not in last week's top 20, OR if its active player count has grown more than 20% from last week.
- A game is an incumbent if it has been in the top 20 for more than 4 consecutive weeks.

**Trending up vs peaked:**
- Trending up: active player count is higher this week than last week.
- Peaked: active player count is lower this week than last week, or the game has been in the top 20 for more than 12 weeks with flat or declining players.

---

## Step 4: Output

```
## Trending Scan
Date: {YYYY-MM-DD}
Week: {YYYY-WW}

### Top 20 Games

| Rank | Game | Genre | Active players | Monthly visits | Age | Trend |
|------|------|-------|---------------|----------------|-----|-------|
| 1    | ...  | ...   | ...           | ...            | ... | up/flat/down/new |

### Summary observations
- New entrants this week: {list}
- Games that have peaked: {list}
- Dominant genres in top 5: {list}
- Most notable newcomer: {game name} — {brief observation}
```
