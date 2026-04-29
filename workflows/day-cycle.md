# Day Cycle Guide

What the human reviewer does between 5 am and 11 pm. This guide covers everything a human needs to interact with the system each day.

---

## 1. Read the Morning Report (5–10 minutes)

The morning report is at:
```
reports/morning/{today's date}.md
```

**What to look for first:**
1. **Active blockers** — anything in "Active Blockers — Human Action Required" needs your attention before 11 pm tonight, or that task will be skipped again.
2. **PRs awaiting human review** — any PR labelled `needs-human` or requiring your merge. These are not auto-merged.
3. **Failures** — any task that failed last night. The report describes what happened and whether human input is needed to fix it.

If there are no blockers, no PRs awaiting review, and no failures: you can skip the rest and come back tonight.

---

## 2. Review PRs

### PRs that auto-merge
PRs with `qa-approved` label and no `needs-human` label are auto-merged by the CI workflow after QA approval. You do not need to do anything for these.

### PRs that require your review
- **`needs-human` label:** A QA escalation for security, data-loss risk, or spec conflict. Read the PR and its comments carefully, then merge or close as appropriate.
- **`tbd-human` label:** A PR you previously left for agents to pick up. If the morning report says Planner has already converted it to tasks, you can leave it. If Planner flagged it as too ambiguous, add a comment clarifying the intent.
- **`live-edit` label:** A PR from a live edit you requested. Review and merge when you're satisfied.

### How to leave feedback on a PR

**For agents to parse your feedback correctly, follow this format in PR comments:**

```
FEEDBACK: {specific instruction}
```

Examples:
```
FEEDBACK: Change the dash cooldown from 2 seconds to 1.5 seconds.
FEEDBACK: The sprint visual effect is missing — add a particle effect on dash start.
FEEDBACK: Do not merge this — the monetisation approach conflicts with what I described in the spec.
```

To mark a PR for pickup in tonight's sprint without further feedback:
- Apply the `tbd-human` label to the PR (or leave a comment: "Pick this up tonight").
- Planner will convert it to a task during sprint generation.

---

## 3. Request a Live Edit

A live edit is a change that should happen immediately — not at the next night cycle.

```bash
./scripts/apply-live-edit.sh "your change request"
```

Example:
```bash
./scripts/apply-live-edit.sh "Change the starting sword damage from 25 to 30 in the sword-game constants module"
```

This triggers Builder to:
1. Log the override to `memory/human-overrides.md`.
2. Create a `live/` branch.
3. Implement the change and open a PR.
4. QA validates the PR.

You then review and merge the PR.

**Be specific** in your live edit request. Vague requests ("make it better") will be flagged as too ambiguous.

---

## 4. Resolve Blockers

Blockers that require human input are listed in each morning report. Common types:

**Spec ambiguity:** Architect or Planner could not determine how to implement something because the spec was unclear. Resolution: add a note to the spec file or add a comment to the relevant GitHub issue.

**Human input required:** A task needs a decision that only you can make (e.g. what asset to use, whether to proceed with a monetisation approach). Resolution: leave a comment on the relevant PR or update `memory/human-overrides.md` with your decision.

**External dependency:** A task cannot proceed until a third-party asset ID, API key, or external resource is provided. Resolution: add the required information where the agent expects to find it (usually a constants file or config).

To mark a blocker as resolved: add a `resolved` timestamp to the blocker entry in `memory/blockers.md`, or leave a PR comment explaining the resolution. Planner reads this at the start of the next night cycle.

---

## What NOT to Do

**Never commit directly to `main`.** All changes go through PRs. Committing to main bypasses QA and breaks the system's PR-based traceability.

**Never edit `plan.md` by hand.** If you want to change the plan, edit the spec file (`specs/{game-name}/spec.md`) and add `REPLAN_REQUESTED` at the top of the spec. Architect will regenerate the plan on the next night cycle.

**Never edit `memory/` files by hand (except `human-overrides.md`).** Memory files are agent-managed. If you need to register a decision, use the live-edit script or add an entry to `memory/human-overrides.md` following the format defined in that file.

**Never merge a PR that QA has blocked.** Blocked PRs have the `qa-failed` label. Merging a blocked PR corrupts the build state. Fix the failure first.

**Never force-push to any branch.** The agents track branch history. Force-pushing can break their view of the commit state.
