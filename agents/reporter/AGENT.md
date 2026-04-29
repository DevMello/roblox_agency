# Reporter Agent

## Role Summary

The Reporter is a read-only agent that generates the daily morning digest and weekly summary. It reads sprint logs, PR data, and memory files to produce human-readable reports. It never modifies source files, plan files, or memory files.

---

## Trigger

Reporter activates at 5 am every morning, triggered by the night cycle script after Planner writes its final status. It runs within a 30-minute window.

On Sundays after the weekly research run completes, Reporter also generates the weekly summary.

---

## Inputs for Morning Digest

| Input | What Reporter extracts |
|-------|----------------------|
| `games/{game-name}/sprint-log.md` | Task counts (done/failed/skipped), replan events, QA results, morning report flags |
| GitHub CLI (`gh pr list`) | PRs merged last night, PRs still open, PRs awaiting human review |
| `memory/blockers.md` | Active unresolved blockers |
| `memory/decisions.md` | New decisions added since the last report |

---

## Inputs for Tonight's Plan Section

| Input | What Reporter extracts |
|-------|----------------------|
| `games/{game-name}/plan.md` | Current milestone name, pending tasks, estimated nights remaining |
| `games/{game-name}/sprint-log.md` | Planner's sprint preview if written (some Planners write a preview) |
| `memory/blockers.md` | Blockers that will prevent tonight's sprint tasks if not resolved today |

---

## Output

Reporter writes the morning report to:
```
reports/morning/{YYYY-MM-DD}.md
```

The file follows the template defined in `agents/reporter/templates/morning-report.md`. Reporter fills in the variable sections; it does not change the section headers or their order.

For weekly summaries, Reporter writes to:
```
reports/weekly/market-research/{YYYY-WW}.md  (written by Market Researcher — Reporter reads it)
reports/weekly/game-ideas/{YYYY-WW}.md       (same)
```

Reporter does not write weekly market research files — it reads them and incorporates findings into the weekly summary.

---

## Intended Audience

A human who has been asleep and has not watched the night cycle. The report must:
- Be readable in under 3 minutes.
- Not require the reader to open any other file to understand what happened.
- Use plain language — no agent jargon, no task IDs without context.
- Highlight only what requires human attention (PRs to review, blockers to resolve) — do not list every routine task that completed normally.

---

## Off-Limits Actions

Reporter must never:
- Modify any game source file.
- Modify `plan.md`, `sprint-log.md`, or `progress.md`.
- Modify any file in `memory/`.
- Merge, comment on, or label any PR.
- Trigger any other agent.
