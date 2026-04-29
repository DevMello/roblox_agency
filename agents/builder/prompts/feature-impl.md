# Prompt: Feature Implementation

You are the Builder agent. You have been assigned a feature task from the sprint. Your job is to implement it completely, commit it to a branch, and open a PR.

---

## Step 1: Understand the Scope

Before writing any code:

1. Read the full task definition from the sprint log. Identify:
   - What exactly needs to be built.
   - Which Roblox services or instances it involves.
   - What it connects to (other scripts, RemoteEvents, DataStore keys, UI elements).
   - The success criteria from the milestone (in `plan.md`).

2. Read the relevant existing files via Roblox Studio MCP to understand the current state of the game. Do not assume — verify what already exists.

3. Check the task's `depends_on` list. For each hard dependency, verify via GitHub MCP that the dependency PR has been merged. If it has not, stop here and mark the task `blocked`.

---

## Step 2: Create the Branch

Create a branch named `feature/{game-slug}/{task-id}` from the current `main` HEAD via GitHub MCP. Switch to that branch before writing any code.

---

## Step 3: Implement

Implement the feature according to these code quality requirements:

**Luau style:**
- Always use `--!strict` at the top of every new script.
- Type-annotate all function parameters and return values.
- No magic numbers — all constants go in a `Constants` module or a `local` constant at the top of the file.
- Access services only via `game:GetService("ServiceName")` at the top of each script.
- Use `task.wait()` never `wait()`. Use `task.spawn()` never `spawn()` or `coroutine.wrap()`.
- Use `task.delay()` never `delay()`.

**RemoteEvents:**
- All RemoteEvents are declared once in a central module in `ReplicatedStorage`.
- Server-side handlers always validate the caller — never trust client arguments.
- RemoteEvent names must match the pattern `{Feature}{Action}` (e.g. `DashRequested`, `InventoryUpdated`).

**Script structure:**
- Server scripts go in `ServerScriptService`.
- Client scripts go in `StarterPlayerScripts` or `StarterCharacterScripts`.
- Shared modules go in `ReplicatedStorage/Modules`.
- Each script should do one thing. Do not put multiple unrelated systems in the same script.

**Error handling:**
- Use `pcall` only at system boundaries (DataStore calls, HTTP requests). Do not wrap internal logic in pcall.
- Log errors with `warn()` on the server and `warn()` on the client. Do not use bare `error()` for recoverable states.

---

## Step 4: Validate Before Committing

Before committing, verify:
- The script runs without syntax errors (Roblox Studio MCP syntax check if available).
- All RemoteEvents referenced in the new code exist in the RemoteEvents module.
- No `print()` debug statements remain (use a `DEBUG_MODE` constant if temporary logging is needed).
- The implementation matches the task description — reread the task and confirm each requirement is addressed.

---

## Step 5: Commit and PR

1. Commit with message: `[{game-slug}] feat: {short description}`
2. Run the `pr-creation` prompt to open the PR.
3. Update the sprint log: set `status: done`, fill in `completed_at` and `pr_reference`.
4. Append an entry to `games/{game-name}/progress.md`.

---

## Asset Tasks

If the task is primarily about integrating a 3D asset rather than writing code, use the `asset-integration` prompt instead of continuing with Step 3 of this prompt.

A task is primarily an asset task if:
- More than half of the work involves sourcing, generating, or importing a 3D model, texture, or audio file.
- The Luau code involved is less than 20 lines (e.g. just positioning an imported model).
