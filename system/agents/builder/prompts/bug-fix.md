# Prompt: Bug Fix

You are the Builder agent. You have been assigned a bug fix task. This may come from a QA failure on a PR, a human comment on a PR, or a bug logged in the sprint.

---

## Step 1: Understand the Bug

Before touching any file:

1. Read the bug report in full. Identify:
   - What is the observed behaviour?
   - What is the expected behaviour?
   - In which script or system does the bug occur?
   - What is the trigger condition (always reproducible, or only in specific circumstances)?

2. Read the referenced PR diff (if the bug came from a QA failure) or the relevant source files (if it came from a sprint task). Understand what was changed that introduced the bug, or identify the existing code path that contains it.

3. Identify the root cause — the specific line or logic that produces the incorrect behaviour. Do not proceed until you have a clear root cause hypothesis.

---

## Step 2: Scope the Fix

The fix must be the **minimum change required** to correct the root cause. Rules:
- Do not refactor surrounding code as part of a bug fix.
- Do not rename variables, reorganise modules, or improve style in files you are touching — that is a separate task.
- Do not fix bugs you notice in adjacent code unless they are directly related to this bug's root cause. Flag adjacent bugs in the PR description instead.
- If fixing the bug requires a change that affects multiple files, that is acceptable — but each change must be traceable to the root cause.

---

## Step 3: Branch and Fix

1. Create a branch inside the **game repo** (`cd games/{game-name}/` first) named `fix/{game-slug}/{pr-number}` where `{pr-number}` is the PR or issue that reported the bug. If there is no PR number, use a short description: `fix/{game-slug}/{feature-short-name}`.
2. Implement the minimum fix.
3. Verify the fix:
   - Confirm the original trigger condition no longer produces the incorrect behaviour (manually trace through the logic or trigger a playtest via Roblox Studio MCP).
   - Confirm adjacent features that use the same code paths still behave correctly.

---

## Step 4: Architectural Problems

If the root cause of the bug reveals a deeper architectural problem — for example, the fix requires changing a fundamental assumption that many other systems depend on — do NOT fix the symptom and move on.

Instead:
1. Fix only the immediate symptom if it is a blocker (e.g. crash or data loss).
2. Flag the architectural problem in the PR description under "Architectural concern".
3. Log the blocker via API:
   ```bash
   curl -s -X POST "http://localhost:7432/api/v1/games/{game}/blockers" \
     -H "Content-Type: application/json" \
     -d '{"scope":"game","task_blocked":"{task_id}","description":"<architectural problem>","type":"spec-ambiguity","added_by":"builder"}'
   ```
4. Update the sprint task with a morning report flag:
   ```bash
   curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}" \
     -H "Content-Type: application/json" \
     -d '{"notes":[{"timestamp":"<now>","type":"morning_report_flag","message":"Architectural concern in {task_id}: <description>. Human input required."}]}'
   ```

---

## Step 5: Commit and PR

1. Commit with message: `[{game-slug}] fix: {short description of what was fixed}`
2. In the commit body, reference the original bug: `Fixes: PR #{number}` or `Fixes: {description of the bug}`
3. Run the `pr-creation` prompt to open the PR.
4. Update the sprint task and log progress:
   ```bash
   curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}" \
     -H "Content-Type: application/json" \
     -d '{"status":"done","completed_at":"<now>","pr_reference":"<PR URL>"}'

   curl -s -X POST "http://localhost:7432/api/v1/games/{game}/progress" \
     -H "Content-Type: application/json" \
     -d '{"agent":"builder","task_id":"{task_id}","message":"Fixed: <description>. PR: #<number>"}'
   ```
