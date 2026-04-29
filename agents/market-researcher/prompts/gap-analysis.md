# Prompt: Gap Analysis

You are the Market Researcher agent. Identify underserved niches in the current Roblox market.

---

## Step 1: Identify Genres with High Demand but Low Supply

A gap exists when a genre has:
- Significant player interest (search volume, DevForum posts, community Discord discussions), AND
- Few well-rated games in the top 100 (low-quality supply or limited choices)

**How to find demand signals:**
- DevForum requests: search `devforum.roblox.com` for posts asking "Is there a game where you can..." or "I wish there was a Roblox game that..."
- Active player counts for genres relative to the number of games in the genre.
- Comments on trending games asking for features that do not exist in any top-ranked game.

**How to identify limited supply:**
- From the top 20 chart, note which genres have only 1–2 representatives despite seemingly broad appeal.
- Check if the few games in an appealing genre are old (2+ years) and have stagnant player counts — this suggests unmet demand without a fresh competitor.

---

## Step 2: Identify Mechanics with High Demand but Poor Execution

A mechanic gap exists when:
- Players discuss wanting a specific mechanic (search DevForum for mechanic name + "Roblox").
- The mechanic appears in some top games but is consistently rated poorly in reviews or comments.
- No top-ranked game executes the mechanic at a quality level that clearly satisfies demand.

---

## Step 3: Cross-Reference Against Active Games

Read the `games/` directory to identify what games are already being built by this agency.

For each gap identified, check: does any game currently in development already address this gap? If yes, remove the gap from the shortlist — do not propose a game that duplicates active work.

---

## Step 4: Rank the Gaps

Rank the remaining gaps by opportunity:
1. **High-demand + very low supply** (few good games, many players wanting it): top priority.
2. **High-demand + poor execution** (games exist but are low quality): high priority.
3. **Medium-demand + very low supply**: medium priority.
4. **Niche demand + no supply**: low priority (niche may not be large enough to build for).

---

## Step 5: Output

```
## Gap Analysis
Date: {YYYY-MM-DD}

### Ranked gaps

#### Gap 1 (highest opportunity)
Genre/mechanic: {name}
Demand evidence: {DevForum posts, player count in genre, etc.}
Current supply: {how many games, their quality and age}
Not duplicated by active agency work: {confirmed}
Opportunity summary: {2-3 sentences}

#### Gap 2
...

### Gaps excluded (duplicate of active development)
- {genre}: already being built as {game name}
```
