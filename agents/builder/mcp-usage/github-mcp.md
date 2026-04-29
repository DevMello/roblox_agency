# Builder Guide: GitHub MCP

Internal guide for all version control operations. Builder never uses git CLI directly — all git operations go through GitHub MCP.

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

```
create_branch(
  branch_name: "feature/sword-game/sg-001",
  from_ref: "main"
)
```

Always confirm the branch was created before writing any code:
```
get_branch(branch_name: "feature/sword-game/sg-001")
→ should return branch info with commit SHA matching main HEAD
```

---

## Committing

```
commit(
  branch_name: "feature/sword-game/sg-001",
  message: "[sword-game] feat: add dash mechanic with server validation",
  files: [
    { path: "src/ServerScriptService/DashHandler.lua", content: "..." },
    { path: "src/ReplicatedStorage/RemoteEvents/DashRequested.lua", content: "..." }
  ]
)
```

**Message format:** `[{game-slug}] {type}: {short description}`
Types: `feat`, `fix`, `asset`, `config`, `ui`, `refactor`, `test`

One commit per logical change. Do not batch unrelated changes in one commit.

---

## Opening a Pull Request

```
create_pr(
  title: "[sword-game] feat: add dash mechanic",
  head_branch: "feature/sword-game/sg-001",
  base_branch: "main",
  body: "...",  # see pr-creation.md for required sections
  labels: ["feature", "sword-game"],
  draft: false
)
```

After creation, record the PR number in the sprint log (`pr_reference` field).

---

## Adding a PR Comment

```
add_pr_comment(
  pr_number: 42,
  body: "QA review requested."
)
```

---

## Checking if a Dependency PR Has Been Merged

Before starting a task with hard dependencies:
```
get_pr(pr_number: 38)
→ check "merged" field: true/false
```

If the dependency PR is not merged:
- Mark the current task `blocked` in the sprint log.
- Add a `failure_reason`: "hard dependency PR #{38} not yet merged."
- Do not start the task.

---

## Checking for Merge Conflicts

When creating a branch from main, check if the task's target files have been modified by another branch:
```
compare_branches(
  base: "main",
  head: "feature/sword-game/sg-001"
)
→ returns list of conflicting files if any
```

If a merge conflict is detected:
- **Do not attempt to resolve it automatically.**
- Mark the task `blocked` with failure reason: "merge conflict detected in {file list}."
- Update the sprint log with a `morning_report_flag` of type `human-input-required`.
- The conflict must be resolved by a human or by Planner on the next cycle.

---

## Changing PR Labels

```
update_pr_labels(
  pr_number: 42,
  add_labels: ["in-progress"],
  remove_labels: ["tbd-human"]
)
```

---

## What Builder Never Does

- Never commits directly to `main`.
- Never force-pushes (`--force`).
- Never merges its own PRs.
- Never deletes branches — branches are cleaned up after merge by repo settings.
- Never amends a commit that has already been pushed to a remote branch.
