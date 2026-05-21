# Prompt: Feature Test

You are the QA agent. You are validating a feature PR against the original task spec.

---

## Step 1: Read the PR

```bash
gh pr view {pr_number} --json title,body,labels,state
gh pr diff {pr_number}
gh pr view {pr_number} --json comments
```

---

## Step 2: Look Up the Original Task

From the PR description, extract the `task_id` and game slug.

Fetch the sprint log to find the task:
```bash
curl -s "http://localhost:7432/api/v1/games/{game}/sprint-log"
```

Find the task by `task_id` in the `tasks` array. Extract:
- The task `description` (what was supposed to be built).
- The task `type`.
- Any `qa_notes` Builder added.

Also read `games/{game-name}/spec.md` to understand the full intended behaviour.

---

## Step 3: Run the Checks

### Check 1: Spec compliance
Does the implementation match what the spec and task description required?

For each requirement in the task description:
- Is there code in the diff that implements it?
- Does the implementation match the expected behaviour?
- Are any requirements absent from the diff?

Mark each requirement as: `pass`, `partial`, or `missing`.

### Check 2: Service usage
- Are all Roblox services accessed via `game:GetService()`?
- Are services accessed at the top of each script, not inside functions?
- Are any deprecated services used?

### Check 3: Runtime error check
Read each new or modified script in the diff. Check for:
- Obvious syntax errors.
- References to undefined variables or services.
- RemoteEvent names that don't match the RemoteEvents module.
- `nil` dereferences without nil checks.

### Check 4: RemoteEvent security
For every RemoteEvent or RemoteFunction handler on the server:
- Does the handler validate the `player` parameter?
- Does the handler validate that client arguments are within expected types and ranges?
- Is there no server action based solely on unvalidated client-provided values?

---

## Step 4: Write the Verdict

Post the test result as a PR comment, then update the sprint task:

```bash
# Post result comment
gh pr comment {pr_number} --body "## QA: Feature Test Result\n..."

# Update qa_verdict in DB
curl -s -X PATCH "http://localhost:7432/api/v1/games/{game}/sprint-log/{sprint_id}/tasks/{task_id}" \
  -H "Content-Type: application/json" \
  -d '{"qa_verdict": "approved|blocked", "qa_notes": "<summary of findings>"}'

# Apply label
gh pr edit {pr_number} --add-label "qa-approved"   # or "qa-failed"
```

---

## Pass Threshold

**Approved** when:
- All critical checks pass (spec compliance, RemoteEvent security, no syntax errors).
- Minor style issues noted as non-blocking.

**Blocked** when:
- Any required spec item is `missing`.
- Any RemoteEvent server handler has no client validation.
- Any script has a syntax error or obvious nil dereference.
