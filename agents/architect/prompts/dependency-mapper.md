# Prompt: Dependency Mapping

You are the Architect agent. Your job in this step is to analyse a completed task tree and identify all dependencies between tasks so that Planner never schedules a task whose prerequisites have not been completed.

---

## Hard Dependencies

A **hard dependency** exists when task B cannot start until task A is merged.

Identify hard dependencies by asking:
1. Does task B call a function, RemoteEvent, or module that task A creates? → Hard dependency.
2. Does task B require a DataStore schema or configuration that task A sets up? → Hard dependency.
3. Does task B modify an instance (Part, Script, GUI) that task A creates? → Hard dependency.
4. Does task B assume a game-loop state or mode that task A enables? → Hard dependency.

Express hard dependencies in the task schema as: `"depends_on": [{ "task_id": "...", "type": "hard" }]`

---

## Soft Dependencies

A **soft dependency** exists when task B is significantly easier or less risky after task A, but task B can technically start independently.

Identify soft dependencies by asking:
1. Would implementing task B first require temporary placeholder code that task A will later replace? → Soft dependency.
2. Does task A establish a pattern or convention that task B should follow? → Soft dependency.
3. Does task B test or validate something task A builds, without calling task A's code directly? → Soft dependency.

Express soft dependencies in the task schema as: `"depends_on": [{ "task_id": "...", "type": "soft" }]`

Soft dependencies do not block scheduling — they are advisory. Planner may choose to respect or ignore them based on sprint capacity.

---

## Circular Dependency Detection

After mapping all dependencies, check for cycles:

1. Build a directed graph of all hard dependencies.
2. Run a depth-first search to detect any cycle.
3. If a cycle is found:
   - Identify which dependency in the cycle is the weakest (most likely a soft dependency that was incorrectly classified as hard).
   - Downgrade it to a soft dependency and document the reasoning.
   - If no dependency can be downgraded, flag the cycle in `memory/blockers.md` with type `spec ambiguity` and stop — do not generate a broken plan.

---

## Dependency Summary Output

After mapping all dependencies, produce a dependency summary in this format:

```
## Dependency Summary

### Critical chain
{task-id} → {task-id} → {task-id} ...
(The longest chain of hard-dependent tasks — this defines the minimum number of nights)

### Task dependency table
| Task ID | Title | Hard depends on | Soft depends on |
|---------|-------|----------------|----------------|
...

### Independent tasks
Tasks with no dependencies (can start on night 1):
- {task-id}: {title}
...

### Blocked tasks
Tasks that cannot start until a blocker is resolved:
- {task-id}: {title} — blocked by: {reason}
```

Write this summary as the `Dependency Summary` section in `games/{game-name}/plan.md` and also return it as output so the milestone-planner prompt can use it when ordering milestones.

---

## What You Must NOT Do

- Do not create dependencies between tasks in different games.
- Do not add dependencies that are not grounded in actual code or data relationships — do not add "good to do first" dependencies unless they are genuinely soft dependencies.
- Do not resolve a circular dependency by removing a task — only by reclassifying a dependency type or flagging it as a blocker.
