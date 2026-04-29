# Skill: GitHub CLI Operations

All version control and PR management for this agency runs through the **GitHub CLI (`gh`)** — not a GitHub MCP server. Use the commands in this file whenever you need to create branches, open PRs, add labels, post comments, or read PR state.

`gh` must be authenticated before use. If `gh auth status` returns an error, stop and surface the issue in the sprint log or morning report — do not attempt workarounds.

---

## Branch Operations

### Create a branch from main and push it
```bash
git fetch origin
git checkout -b feature/sword-game/sg-001 origin/main
git push -u origin feature/sword-game/sg-001
```

### Verify the branch was created on the remote
```bash
git ls-remote --heads origin feature/sword-game/sg-001
# Returns the commit SHA if the branch exists; empty output means it was not created
```

### Branch naming rules
| Branch type | Format | Example |
|------------|--------|---------|
| New feature task | `feature/{game-slug}/{task-id}` | `feature/sword-game/sg-001` |
| Bug fix | `fix/{game-slug}/{pr-number}` | `fix/sword-game/pr-42` |
| Live edit | `live/{game-slug}/{short-description}` | `live/sword-game/change-dash-cooldown` |

- Always branch from `main`, never from another feature branch.
- Keep branch names under 60 characters.
- Lowercase letters, numbers, and hyphens only.

---

## Committing

```bash
git add src/ServerScriptService/DashHandler.lua src/ReplicatedStorage/RemoteEvents/DashRequested.lua
git commit -m "[sword-game] feat: add dash mechanic with server validation"
git push
```

**Commit message format:** `[{game-slug}] {type}: {short description}`
Types: `feat`, `fix`, `asset`, `config`, `ui`, `refactor`, `test`

One commit per logical change. Do not batch unrelated changes.

---

## Opening a Pull Request

```bash
gh pr create \
  --title "[sword-game] feat: add dash mechanic" \
  --body "$(cat <<'EOF'
## Summary
...

## Spec reference
- Game: sword-game
- Task ID: sg-001
- Milestone: milestone-1
- Spec section: Combat mechanics

## How to test
1. ...

## Screenshots or output logs
No console output expected — feature is logic-only.

## Known limitations
None.
EOF
)" \
  --base main \
  --label "feature" \
  --label "sword-game"
```

After creation, record the PR number and URL in the sprint log (`pr_reference` field).

To open as a **draft**:
```bash
gh pr create --draft ...
```

---

## Adding a PR Comment

```bash
gh pr comment 42 --body "QA review requested."
```

---

## Checking if a Dependency PR Has Been Merged

```bash
gh pr view 38 --json merged --jq '.merged'
# Outputs: true / false
```

If the dependency PR is not merged:
- Mark the current task `blocked` in the sprint log.
- Set `failure_reason`: `"hard dependency PR #38 not yet merged."`
- Do not start the task.

---

## Checking for Merge Conflicts

```bash
git fetch origin
# Check if the branch can be cleanly merged into main
git merge-tree $(git merge-base origin/main origin/feature/sword-game/sg-001) origin/main origin/feature/sword-game/sg-001
# If the output contains conflict markers (<<<<<<<), there is a conflict
```

Alternatively, for a file-level conflict list:
```bash
gh api repos/{owner}/{repo}/compare/main...feature/sword-game/sg-001 --jq '[.files[].filename]'
```

If a merge conflict is detected:
- **Do not attempt to resolve it automatically.**
- Mark the task `blocked` with `failure_reason: "merge conflict detected in {file list}."`
- Add a `morning_report_flag` of type `human-input-required`.

---

## Changing PR Labels

### Add a label
```bash
gh pr edit 42 --add-label "in-progress"
```

### Remove a label
```bash
gh pr edit 42 --remove-label "tbd-human"
```

### Add and remove in one command
```bash
gh pr edit 42 --add-label "in-progress" --remove-label "tbd-human"
```

---

## Reading a PR (title, body, diff, comments, labels)

```bash
# Metadata
gh pr view 42 --json number,title,body,state,labels,merged

# Full diff
gh pr diff 42

# Comments only
gh pr view 42 --json comments --jq '.comments[] | {author: .author.login, body: .body}'
```

---

## Listing PRs by Label

```bash
# Open PRs with a specific label
gh pr list --label "tbd-human" --state open --json number,title,body,labels,state

# PRs merged since a given timestamp (ISO 8601)
gh pr list --state merged --json number,title,mergedAt,labels \
  --jq '[.[] | select(.mergedAt >= "2025-04-29T23:00:00Z")]'
```

---

## Reading the PR Diff for QA

```bash
gh pr diff 42
# Outputs unified diff of all changed files — pipe to a file or read directly
```

---

## What Builder Never Does

- Never commits directly to `main`.
- Never uses `--force` when pushing.
- Never merges its own PRs.
- Never deletes branches — cleaned up after merge by repo settings.
- Never amends a commit that has already been pushed.

---

## gh Health Check

Before starting any night cycle operation, verify `gh` is authenticated and can reach GitHub:

```bash
gh auth status
# Must exit 0 and show an authenticated account

gh api rate_limit --jq '.rate | {limit, remaining, reset}'
# Should show remaining > 1000 for a comfortable night cycle
```

If `gh auth status` fails or rate limit is critically low (< 100 remaining), abort and surface in the morning report.
