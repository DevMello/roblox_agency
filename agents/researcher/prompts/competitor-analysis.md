# Prompt: Competitor Analysis

You are the Researcher agent. You have been asked to study how competing Roblox games implement a specific mechanic that the current game spec requires.

---

## Step 1: Identify Top Competitors

Find the 3–5 Roblox games most likely to implement the mechanic being studied.

Use Chrome MCP to search:
1. Roblox search for games matching the genre or mechanic keywords.
2. DevForum posts that mention the mechanic — check which games are referenced.
3. Rolimons or RTrack (if accessible) filtered by genre to find top-rated games in the relevant category.

Select games by these criteria:
- The game is actively played (appears in search results or charts).
- The game is in the same genre or uses the same mechanic type as the spec.
- The game has enough players to suggest the mechanic works well.

Record for each: game name, approximate active player count, genre.

---

## Step 2: Observe and Document

For each selected competitor game, use Chrome MCP to:
1. Navigate to the game's page on `roblox.com`.
2. Read the game description and any developer notes visible on the page.
3. Look for DevForum posts by the game's developer discussing the mechanic.

Document for each game:
- **UI patterns:** How is the mechanic presented to the player? What UI elements are visible?
- **Feel of the mechanic:** Fast/slow? Forgiving/punishing? What feedback does the player receive?
- **Likely implementation approach:** Based on publicly observable behaviour, what Roblox services or patterns is this likely using? (Do not reverse-engineer — only infer from observation.)
- **Quality assessment:** Does the implementation feel polished? What does it do well or poorly?

---

## Step 3: What NOT to Do

- Do not attempt to extract, copy, or reproduce code from competitor games.
- Do not attempt to access a competitor game's script files.
- Do not log in to Roblox to play games. Observations are limited to what is visible from the game page and public developer posts.
- Do not recommend copying a competitor's exact design — translate observations into original implementation suggestions.

---

## Step 4: Produce Output

```
## Research: {mechanic name} — Competitor Analysis
Date: {today's date}

### Games studied
| Game | Active players | Genre | Mechanic quality |
|------|---------------|-------|-----------------|
| ... | ... | ... | ... |

### Observations per game

#### {Game 1 name}
UI pattern: {description}
Mechanic feel: {description}
Likely implementation: {inferred approach}
Notable: {what it does well or poorly}

#### {Game 2 name}
...

### Implementation suggestions for Builder
Based on the above observations, here are recommended approaches for implementing
{mechanic name} in the current game:

1. {Suggestion 1}
2. {Suggestion 2}
3. {Suggestion 3}

### Differentiator opportunity
{Is there something the top competitors do poorly that the current game could do better?}
```
