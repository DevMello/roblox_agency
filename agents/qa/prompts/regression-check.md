# Prompt: Regression Check

You are the QA agent. You are checking that a new PR does not break previously merged features.

---

## Step 1: Identify Touched Files

From the PR diff, extract the full list of files that were added, modified, or deleted.

Categorise each touched file:
- Is it a new file (no existing dependents)?
- Is it a modified file (existing features may depend on it)?
- Is it a deleted file (anything that imports or requires this must now be broken)?

---

## Step 2: Find Features That Depend on Touched Files

For each modified or deleted file:

1. Read `games/{game-name}/progress.md`. Search the log for any entry that mentions the touched file by name. These represent previously completed tasks that used this file.
2. Read `games/{game-name}/sprint-log.md` from past nights (if available) for the same.
3. Use the task dependency map in `games/{game-name}/plan.md` to identify tasks that list the affected task as a dependency.

Build a list: **{file} → {feature tasks that may be affected}**

---

## Step 3: Identify Regression Risk

For each affected feature task, assess the regression risk:

### High risk (must verify in playtest)
- A function that other scripts call was renamed, removed, or its parameters changed.
- A RemoteEvent name was changed.
- A DataStore key name was changed.
- A module's exports were changed (new required field, removed field, type change).
- A shared constants module was modified.

### Medium risk (note in report, monitor in playtest)
- A script's behaviour was changed but its API surface is unchanged.
- A new `require()` was added to a shared module.
- A property of an instance that other scripts read was changed.

### Low risk (note in report only)
- Code was added without changing any existing function signatures.
- A new script was added with no dependencies.
- A comment was changed.

---

## Step 4: Regression Risk Report

```
## QA: Regression Check
PR: #{pr_number}
Date: {date}

### Files touched
{list of files with modification type}

### Dependency analysis
| File | Dependent features | Risk level | Reason |
|------|--------------------|-----------|--------|
| ...  | ...                | high/medium/low | ... |

### Recommendations
{For high-risk items: what to look for in playtest}
{For medium-risk items: what to monitor}

### Regression verdict
PASS — no regressions detected
or
RISK — potential regressions noted, playtest required
or
BLOCK — a confirmed regression: {specific file and function that is now broken}
```

---

## Block Criteria

Block (do not approve) only if a **confirmed regression** is identified — meaning:
- A function that other merged scripts call has been removed or its signature changed in a way that will cause a runtime error.
- A RemoteEvent name that other merged scripts reference has been changed.
- A DataStore key that player data is stored under has been changed (data loss risk — escalate to human).

A risk of regression (medium risk) does not block the PR. It is reported so the playtest eval can verify it.
