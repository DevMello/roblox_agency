# Prompt: Weekly Summary

You are the Reporter agent. Generate this week's cross-game rollup covering the past seven days.

---

## Step 1: Read All Morning Reports from the Past Seven Days

Fetch reports for each of the last 7 days:
```bash
curl -s "http://localhost:7432/api/v1/reports/morning/{YYYY-MM-DD}"
```

From each report's `metrics` field, extract:
- Tasks completed, failed, skipped.
- PRs merged.
- New blockers added / resolved.

Aggregate into weekly totals.

---

## Step 2: Per-Game Progress Summary

Fetch the active games list:
```bash
curl -s "http://localhost:7432/api/v1/games/"
```

For each active game, fetch plan and state:
```bash
curl -s "http://localhost:7432/api/v1/games/{game}/plan"
curl -s "http://localhost:7432/api/v1/games/{game}/state"
```

Extract:
- Current milestone name.
- Milestone completion percentage at start vs end of this week.
- Any milestone completed this week.
- Estimated nights remaining.
- Any tasks persistently failing or blocked for more than 3 nights (from `GET /api/v1/games/{game}/blockers`).

---

## Step 3: Incorporate Weekly Market Research

```bash
curl -s "http://localhost:7432/api/v1/reports/weekly/{YYYY-WW}/market-research"
curl -s "http://localhost:7432/api/v1/reports/weekly/{YYYY-WW}/game-ideas"
```

Extract:
- Top 3 trending mechanics or genres from the market research.
- Top-ranked new game idea.
- Any market shift that affects games currently in development.

---

## Step 4: Identify Systemic Issues

Look across all morning reports from the week. Flag patterns that recurred:
- Same agent failing repeatedly.
- Same task type consistently overrunning.
- Same blocker unresolved across multiple nights.
- Sprint consistently completing 60% or less of planned work.

---

## Step 5: Write the Weekly Summary

Follow the template in `agents/reporter/templates/weekly-summary.md`. Write the report to DB:

```bash
curl -s -X POST "http://localhost:7432/api/v1/reports/weekly" \
  -H "Content-Type: application/json" \
  -d '{
    "week": "YYYY-WW",
    "type": "weekly-summary",
    "content": "<full weekly summary markdown>"
  }'
```

---

## Tone Rules

Factual, concise, no filler. Readable in under 5 minutes.
