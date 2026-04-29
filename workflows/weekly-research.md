# Weekly Research Runbook

---

## When It Runs

Every Sunday at 2:00 am ET, triggered by `.github/workflows/weekly-research.yml` and executable manually via:
```bash
./scripts/launch-weekly-research.sh
```

---

## Sequence

The research run executes four steps in order. Each step's output feeds into the next.

### Step 1: Trending Scan (~30 minutes)
Prompt: `agents/market-researcher/prompts/trending-scan.md`

Market Researcher navigates to the Roblox charts and extracts data for the top 20 games. Output is a structured table of game names, genres, player counts, and trend direction.

### Step 2: Revenue Analysis (~20 minutes)
Prompt: `agents/market-researcher/prompts/revenue-analysis.md`

Using the top 20 games from Step 1, Market Researcher visits each game's store page and documents monetisation signals. Output is a per-game monetisation classification and a summary of dominant models.

### Step 3: Gap Analysis (~20 minutes)
Prompt: `agents/market-researcher/prompts/gap-analysis.md`

Using the trending scan and revenue analysis, Market Researcher identifies genres and mechanics with high demand but poor supply. Cross-references against active games to avoid duplicate proposals. Output is a ranked shortlist of gaps with supporting evidence.

### Step 4: Idea Generation (~20 minutes)
Prompt: `agents/market-researcher/prompts/idea-generation.md`

Using the gap analysis, Market Researcher generates 3–5 new game concept proposals in spec-ready format with a recommendation ranking.

---

## Outputs

After all four steps complete, Market Researcher writes two files:

```
reports/weekly/market-research/{YYYY-WW}.md   ← trending scan + revenue analysis + gap analysis
reports/weekly/game-ideas/{YYYY-WW}.md        ← idea proposals + recommendation ranking
```

Where `{YYYY-WW}` is the ISO year and week number (e.g. `2026-18`).

---

## How the Human Reviews Outputs

Each Sunday or Monday morning, open:
```
reports/weekly/game-ideas/{YYYY-WW}.md
```

Read the recommendation ranking. If you want to start building the top-ranked idea:

1. Copy the idea's fields into a new spec file:
   ```
   specs/{game-name}/spec.md
   ```
2. Use `specs/template.md` to fill in the full spec (the idea proposal gives you the core fields; you need to add art direction, full feature list, success criteria, etc.).
3. On the next night cycle, the pre-flight check will detect the new spec and activate Architect.

If you want to delay or reject an idea: no action needed. Ideas that are not promoted to spec files are not acted on.

---

## Time Budget and Overrun Handling

The full research run typically takes ~90 minutes. Time cap: 2 hours.

If the run exceeds 2 hours before all four steps complete:
- Market Researcher writes whatever outputs it has completed.
- The incomplete steps are noted at the top of the market research report.
- The run does not restart automatically — the next weekly run starts fresh.

If the run completes in under 2 hours, no further action is needed. The outputs are ready for human review in the morning.
