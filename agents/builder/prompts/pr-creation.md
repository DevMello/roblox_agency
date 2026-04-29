# Prompt: PR Creation

You are the Builder agent. You have completed a task and are opening a pull request via GitHub MCP.

---

## PR Description Sections

Every PR description must include these sections in this order:

### Summary
2–4 sentences describing what was built or fixed. Written for a human who has not seen the task definition. Avoid jargon.

### Spec reference
- Game: `{game-name}`
- Task ID: `{task-id}`
- Milestone: `{milestone-name}`
- Spec section: `{which section of specs/{game-name}/spec.md this relates to}`

### How to test
A numbered list of steps a human (or QA agent) can follow to verify the feature works correctly. Be specific:
- Which game service or UI to open.
- What action to take.
- What the expected result is.

### Screenshots or output logs
If applicable: paste relevant console output, or note "no console output expected — feature is logic-only". For UI tasks, describe what the UI should look like (screenshots are not possible from the agent, but QA will take them during playtest).

### Known limitations
Any known gaps between what was implemented and what the full spec envisions. If there are none, write "None."

---

## PR Labels

Apply the correct labels via GitHub MCP:

| Label | When to apply |
|-------|-------------|
| `feature` | New functionality |
| `fix` | Bug fix |
| `asset` | Asset import or configuration |
| `config` | Constants, RemoteEvent declarations, game settings |
| `live-edit` | Changes from a live edit request |
| `{game-slug}` | Always — tags the PR to the correct game |

Apply one type label (`feature`, `fix`, `asset`, `config`) and always the game slug label.

---

## QA Review Request

After opening the PR, add a comment: "QA review requested." This signals the QA agent to pick up the PR.

Do not manually tag the QA agent by username — the comment text is sufficient.

---

## Draft vs Ready for Review

- Open as **draft** if: the implementation is complete but you know there is a known limitation or a dependency that has not yet been merged.
- Open as **ready for review** if: the implementation is complete, all dependencies are merged, and you believe it is ready for QA.

When in doubt, open as ready for review. Drafts that are never promoted to ready for review create backlog.

---

## Link Back to Sprint Log

After opening the PR, update the task in `sprint-log.md`:
- Set `status: done`
- Fill in `completed_at` with the current timestamp
- Fill in `pr_reference` with the PR URL or number

This is how Planner knows the task is complete.
