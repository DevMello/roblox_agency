# Builder Guide: GitHub CLI

Internal guide for all version control operations. Builder uses the **GitHub CLI (`gh`)** and standard `git` for all GitHub interactions — there is no GitHub MCP server.

For the complete command reference, read `.claude/skills/github-cli.md`.

---

## Branch Naming Conventions

| Branch type | Format | Example |
|------------|--------|---------|
| New feature task | `feature/{game-slug}/{task-id}` | `feature/sword-game/sg-001` |
| Bug fix | `fix/{game-slug}/{pr-number}` | `fix/sword-game/pr-42` |
| Live edit | `live/{game-slug}/{short-description}` | `live/sword-game/change-dash-cooldown` |

Rules:
- Always branch from `main`, not from another feature branch.
- Keep branch names under 60 characters.
- Use only lowercase letters, numbers, and hyphens.

---

## Creating a Branch

```bash
git fetch origin
git checkout -b feature/sword-game/sg-001 origin/main
git push -u origin feature/sword-game/sg-001
```

Always confirm the branch was created before writing any code:
```bash
git ls-remote --heads origin feature/sword-game/sg-001
# Must return a SHA — empty output means push failed
```

---

## Committing

```bash
git add src/ServerScriptService/DashHandler.lua \
        src/ReplicatedStorage/RemoteEvents/DashRequested.lua
git commit -m "[sword-game] feat: add dash mechanic with server validation"
git push
```

**Message format:** `[{game-slug}] {type}: {short description}`
Types: `feat`, `fix`, `asset`, `config`, `ui`, `refactor`, `test`

One commit per logical change. Do not batch unrelated changes in one commit.

---

## Opening a Pull Request

```bash
gh pr create \
  --title "[sword-game] feat: add dash mechanic" \
  --base main \
  --body "..." \
  --label "feature" \
  --label "sword-game"
```

After creation, record the PR number in the sprint log (`pr_reference` field).

---

## Adding a PR Comment

```bash
gh pr comment 42 --body "QA review requested."
```

---

## Checking if a Dependency PR Has Been Merged

Before starting a task with hard dependencies:
```bash
gh pr view 38 --json merged --jq '.merged'
# true = merged, false = not yet merged
```

If the dependency PR is not merged:
- Mark the current task `blocked` in the sprint log.
- Add a `failure_reason`: `"hard dependency PR #38 not yet merged."`
- Do not start the task.

---

## Checking for Merge Conflicts

When creating a branch from main, verify target files have no conflicts:
```bash
git fetch origin
git merge-tree \
  $(git merge-base origin/main origin/feature/sword-game/sg-001) \
  origin/main \
  origin/feature/sword-game/sg-001
# Conflict markers (<<<<<<<) in output = conflict exists
```

If a merge conflict is detected:
- **Do not attempt to resolve it automatically.**
- Mark the task `blocked` with failure reason: `"merge conflict detected in {file list}."`
- Update the sprint log with a `morning_report_flag` of type `human-input-required`.
- The conflict must be resolved by a human or by Planner on the next cycle.

---

## Changing PR Labels

```bash
gh pr edit 42 --add-label "in-progress" --remove-label "tbd-human"
```

---

## What Builder Never Does

- Never commits directly to `main`.
- Never force-pushes (`--force`).
- Never merges its own PRs.
- Never deletes branches — branches are cleaned up after merge by repo settings.
- Never amends a commit that has already been pushed to a remote branch.
