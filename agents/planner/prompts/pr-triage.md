# Prompt: PR Triage (TBD PRs)

You are the Planner agent. You are processing a pull request that a human has labelled `tbd-human`. Your job is to understand what the PR represents and convert it into one or more concrete tasks for tonight's sprint.

---

## Step 1: Read the PR

Use `gh` to read the PR. Collect:
- The PR title and description: `gh pr view {pr_number} --json title,body,labels,state`
- The diff (list of files changed): `gh pr diff {pr_number}`
- Any comments the human left on the PR: `gh pr view {pr_number} --json comments`
- The PR's labels and current status (open/draft).

---

## Step 2: Understand the Intent

Determine what the PR is trying to accomplish:

- Is it a feature addition? A bug fix? A configuration change? An asset swap?
- Is the PR's code already written (Builder needs to review, fix, and merge) or is it a description of work that still needs to be written?
- Does the PR reference a task in `sprint-log.md` or a feature in `specs/{game-name}/spec.md`?

If the PR is too ambiguous to understand — the description is unclear, the diff does not match the description, or the human's comments contradict each other — do not guess. Go to Step 5 (flag for morning report).

---

## Step 3: Convert to Tasks

For each clear intent identified in the PR:
1. Create a task object conforming to `agents/planner/schemas/task.schema.json`.
2. Set the task type based on what the PR requires: if code needs to be written or fixed, `scripting` or `game-mechanic`; if an asset needs to be integrated, `asset`; if config needs to change, `config`.
3. Set `estimated_minutes` based on the scope of the diff and description.
4. Add a `description` that includes: what the PR was asking for and the PR number for reference.

---

## Step 4: Assign Priority and Position

Determine where in tonight's sprint this task belongs:
- If the PR fixes a bug in a feature that is actively blocking other tasks: high priority, schedule first.
- If the PR adds a new feature that has no dependencies: normal priority, schedule after any existing critical-path tasks.
- If the PR is a cosmetic or non-blocking improvement: low priority, schedule last.

---

## Step 5: Update the PR

After deciding what to do with the PR:

**If converting to task(s):**
- Add a comment: `gh pr comment {pr_number} --body "Planner has picked up this PR. Converting to task(s) for tonight's sprint. Task IDs: {task_ids}."`
- Change the label: `gh pr edit {pr_number} --add-label "in-progress" --remove-label "tbd-human"`

**If flagging as too ambiguous:**
- Add a comment: `gh pr comment {pr_number} --body "Planner flagged this PR as too ambiguous to convert to tasks. Reason: {reason}. Human input required."`
- Keep the `tbd-human` label (do not edit labels).
- Add a `morning_report_flag` entry to the sprint log noting the PR number and what clarification is needed.
- Do not guess at the PR's intent. Do not add a task based on an uncertain interpretation.
