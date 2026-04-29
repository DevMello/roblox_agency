# Human Overrides

Append-only log of every change a human has made or requested. This file is the system's guarantee that human decisions are never reversed by autonomous agents.

---

## Rules

1. **Entries are never deleted.** Not by agents, not by humans. If an entry is wrong, supersede it with a new entry.
2. **A newer entry supersedes an older one on the same feature.** Mark the old entry with `Status: superseded by override-{new-id}`.
3. **Planner reads this entire file before every sprint.** Any planned task that conflicts with an active override is removed or adapted.
4. **Builder writes to this file on behalf of the human during live edits.** The human may also write entries directly.

---

## Entry Format

```
## Override: {short description}
ID: override-{YYYY-MM-DD-HH-MM}
Timestamp: {ISO 8601}
Game: {game-name}
Type: {live-edit | design-decision | feature-block | feature-require | cost-cap-override}
Requested by: {human | builder-on-behalf-of-human}
Request: {exact text of what was requested or decided}
Affected files: {list of files, or "N/A" for non-file decisions}
Status: {active | superseded by override-{id} | rejected | expired}
Applied by: {builder | human | n/a}
Supersedes: {override-id of previous override this replaces, or "none"}
```

---

## Active Overrides

*No overrides recorded yet. This file will be populated as the project progresses.*

---

## Resolved / Superseded Overrides

*None yet.*
