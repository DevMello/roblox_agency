# PR Review Protocol

How every type of pull request in the system is handled — from creation through QA, auto-merge, and human review.

---

## Four PR Types

### 1. Feature PR
**Branch:** `feature/{game-slug}/{task-id}`
**Labels:** `feature`, `{game-slug}`
**Created by:** Builder after completing a feature task.
**Review path:**
1. Builder opens PR, adds comment "QA review requested."
2. QA runs `feature-test`, `regression-check`, `playtest-eval`.
3. If QA approves → `qa-approved` label added → auto-merged by CI (no human review required unless the PR description notes otherwise).
4. If QA blocks → `qa-failed` label added → Builder fixes → re-requests QA review.

### 2. Fix PR
**Branch:** `fix/{game-slug}/{pr-number}`
**Labels:** `fix`, `{game-slug}`
**Created by:** Builder after completing a bug fix task.
**Review path:** Same as feature PR. Auto-merged after QA approval.

### 3. Asset PR
**Branch:** `feature/{game-slug}/{task-id}` (asset tasks use the feature branch convention)
**Labels:** `asset`, `{game-slug}`
**Created by:** Builder after completing an asset integration task.
**Review path:** Same as feature PR. QA playtest-eval is particularly important for asset PRs (visual/collision checks).

### 4. Live-Edit PR
**Branch:** `live/{game-slug}/{description}`
**Labels:** `live-edit`, `{game-slug}`, type label
**Created by:** Builder via the live-edit workflow.
**Review path:**
1. QA runs standard checks.
2. After QA approval: **human review required** — auto-merge is disabled for live-edit PRs.
3. Human merges (or rejects).

---

## QA Approval

QA approval is signalled by:
- Adding the `qa-approved` label to the PR.
- Adding a PR comment: "QA approved. Ready to merge."
- Updating `qa_verdict: "approved"` in the sprint log.

QA approval without the label (comment-only) is not sufficient for auto-merge.

---

## Auto-Merge Conditions

A PR is auto-merged by the CI workflow when all of the following are true:
1. The PR has the `qa-approved` label.
2. The PR does NOT have the `live-edit` label.
3. The PR does NOT have the `needs-human` label.
4. The PR is not in draft state.
5. All required CI checks pass (if any are configured).

---

## Human-Required Review Flags

A PR requires human review when any of these labels are present:
- `needs-human` — QA escalated (security, data-loss risk, or spec conflict).
- `live-edit` — all live-edit PRs require human merge.
- `tbd-human` — a PR the human explicitly marked for their own review.

These PRs appear in the "PRs Awaiting Human Review" section of the morning report.

---

## TBD PR Processing

A PR labelled `tbd-human` means: "a human left this PR for agents to figure out at night."

At the start of the next night cycle, Planner runs the `pr-triage` prompt on all `tbd-human` PRs:
- If the PR can be converted to concrete tasks: label changed to `in-progress`, tasks added to tonight's sprint.
- If the PR is too ambiguous: remains `tbd-human`, flagged in morning report for human clarification.

A `tbd-human` PR that has been open for more than 3 nights without being triaged will be escalated in the morning report with a note that human clarification is required.

---

## Stale PRs

A PR is considered stale if it has been open for more than 3 nights without receiving a QA verdict or a human merge:

**QA-failed PRs open > 3 nights:**
- Flagged in the morning report.
- Planner adds a blocker entry for the task.
- Builder is not re-assigned the fix until the blocker is acknowledged.

**Awaiting-human PRs open > 3 nights:**
- Flagged in the morning report with increasing urgency.
- After 7 nights, Planner adds a `needs-human` priority flag to the morning report.

**TBD PRs open > 3 nights:**
- Flagged in the morning report asking for clarification or to close if no longer relevant.

Stale PRs are never auto-closed by agents. Only a human or an explicit new sprint task can close them.
