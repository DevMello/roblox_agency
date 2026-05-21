# Live Edit Protocol

The exact protocol for handling a human's real-time change request. This is the most human-safety-critical workflow in the system because it immediately modifies game files and permanently logs the change as an override.

---

## Step 1: Human Makes a Request

The human runs:
```bash
./scripts/apply-live-edit.sh "change request in plain language"
```

The change request must be specific enough for Builder to implement without asking follow-up questions. If it is ambiguous, Builder will flag it rather than guess.

**Examples of valid requests:**
- `"Change the dash cooldown in sword-game from 2 seconds to 1.5 seconds"`
- `"Replace the arena floor texture in sword-game with asset ID 12345678"`
- `"Disable the leaderboard feature in tower-game until further notice"`

**Examples of requests that will be flagged as too ambiguous:**
- `"Make the game feel better"`
- `"Fix the dash"`
- `"Update the shop"`

---

## Step 2: Builder Writes to Memory (BEFORE ANY CODE)

Before opening any file, before reading any script, Builder appends to `memory/human-overrides.md`:

```
## Override: {short description}
ID: override-{timestamp}
Timestamp: {ISO 8601}
Game: {game-name}
Type: live-edit
Requested by: human
Request: {exact text of the request}
Affected files: {list — or "TBD" if not yet known}
Status: active
Applied by: builder
Supersedes: {override-ID of any previous override this replaces, or "none"}
```

This write is the permanent record. If anything goes wrong after this point, the record still exists.

---

## Step 3: Builder Creates a Branch and Implements

1. Create branch: `live/{game-slug}/{short-description}` from current `main` HEAD.
2. Implement the change exactly as requested. Do not improve, extend, or combine with sprint tasks.
3. If the change conflicts with a task currently in tonight's planned sprint: remove the sprint task (set status `skipped`, add note "Removed due to conflicting live edit") before implementing.

---

## Step 4: Builder Opens a PR

Builder runs the `pr-creation` prompt with these additions:
- Label the PR: `live-edit`, `{game-slug}`, and the type label (`feature`/`fix`/`config` as appropriate).
- Add section "Live edit rationale" in the PR body: what was requested, why it was not deferred to the night cycle.
- Open as ready for review (not draft).
- Add comment: "QA review requested."

---

## Step 5: QA Validates

QA runs its standard checks on the PR (feature-test, regression-check, playtest-eval). A live edit must pass the same QA bar as a regular feature PR.

If QA blocks the live edit: the `qa-failed` label is applied. Builder fixes the issue and updates the PR. The human is notified via the morning report flags.

---

## Step 6: Human Reviews and Merges

The human reviews the PR. Options:
- **Merge:** The change is applied. The override remains active in `memory/human-overrides.md`.
- **Request changes:** Leave a PR comment with `FEEDBACK: {specific change}`. Builder will update the branch.
- **Close/reject:** The PR is closed without merging. Builder adds a note to the override entry: `Status: rejected — not applied`. The override entry remains in the file (never deleted) but is marked as not applied.

---

## Step 7: Game Overrides File Updated

After the PR is merged, the `games/{game-name}/overrides.md` file is updated (by Builder or automatically by the merge hook):

```
## Override: {short description}
Date: {date}
PR: #{pr-number}
Request: {what was requested}
Files changed: {list}
Status: applied and merged
Note: Active override. Planner will not schedule tasks that reverse this change.
```

---

## Reversing a Live Edit

If the human requests a reversal of a previous live edit the next day:

1. Run a new live edit: `./scripts/apply-live-edit.sh "reverse the change from [date]: [description]"`.
2. Builder creates a new override entry that supersedes the previous one: `Supersedes: override-{old-id}`.
3. The old override is marked `Status: superseded` in `memory/human-overrides.md`.
4. The new PR reverts the files to their pre-live-edit state.

Overrides do not stack. A new override for the same feature always supersedes the previous one.

---

## Live Edit vs Sprint Conflict

If a live edit request covers something that is also in tonight's planned sprint:
1. Builder removes the sprint task immediately (sets status `skipped` in sprint-log.md).
2. The live edit is applied instead.
3. The removed task is noted in the override entry so Planner knows not to reschedule it unless the override is superseded.
4. If the live edit and sprint task have the same goal, the task is marked `done` after the live edit merges — not rescheduled.
