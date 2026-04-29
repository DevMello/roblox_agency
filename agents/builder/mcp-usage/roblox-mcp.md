# Builder Guide: Roblox Studio MCP

Internal guide for using the Roblox Studio MCP server. Read this before your first Roblox Studio MCP call each session.

---

## Connection

**URL:** `localhost:3001`

Always verify connection before use:
```
health_check → should return { "status": "ok", "studio_open": true }
```

If `studio_open` is false, Roblox Studio is not running. Mark the task blocked — do not attempt any Studio operations without an open Studio session. Log the issue in `memory/blockers.md`.

---

## What You Can Do

### Read scripts
- `read_script(path)` — reads a Luau script from the given Workspace path.
- Path format: `"ServerScriptService/GameSystems/DashHandler"` (no `.lua` extension).
- Returns the script's source as a string.

### Write scripts
- `write_script(path, source)` — writes a Luau script at the given path. Creates the script if it does not exist.
- Always read the existing script first before overwriting — never blindly overwrite without seeing current contents.

### Read/write instance properties
- `get_property(path, property)` — reads a property of any Instance.
- `set_property(path, property, value)` — sets a property.
- Example: `set_property("Workspace/Arena/Floor", "Anchored", true)`

### Create instances
- `create_instance(class_name, parent_path, properties)` — inserts a new Instance.
- Example: `create_instance("RemoteEvent", "ReplicatedStorage/RemoteEvents", { Name: "DashRequested" })`

### List children
- `list_children(path)` — returns the names and class names of all children of an instance.

### Delete instances
- `delete_instance(path)` — permanently removes an instance. Use with care — this cannot be undone via MCP.

### Trigger playtest
- `start_playtest()` — starts a Studio local test session.
- `stop_playtest()` — stops the test session.
- `get_console_output()` — returns recent console output from the test session.

### Save the game file
- `save_game()` — saves the current Studio file. Call this after all changes for a task before committing.

---

## Studio Mode Requirements

Some operations require Studio to be in a specific mode:

| Operation | Required mode |
|-----------|-------------|
| Read/write scripts | Edit mode (not Play mode) |
| Create/delete instances | Edit mode |
| Trigger playtest | Edit mode (transitions to Play mode) |
| Read console output | Play mode |

To stop playtest and return to edit mode: `stop_playtest()`.

---

## Operations NOT Supported via MCP

These operations are not available via the MCP server and must be done via direct Luau script or Studio UI (human action):

- Publishing the game to Roblox
- Importing FBX/OBJ files (handled by a separate import endpoint — see `asset-integration.md`)
- Configuring game thumbnail or description
- Managing the Toolbox or asset library
- Changing Team Create settings

---

## Confirming a Change Was Saved

After every `write_script` or `set_property` call, verify the change with a read:
- `read_script(path)` — confirm the source matches what you wrote.
- `get_property(path, property)` — confirm the property value.

After all task changes, call `save_game()` before committing to the Git branch.

---

## Common Patterns

### Checking if a RemoteEvent exists before creating it
```
children = list_children("ReplicatedStorage/RemoteEvents")
if "DashRequested" not in children:
    create_instance("RemoteEvent", "ReplicatedStorage/RemoteEvents", { Name: "DashRequested" })
```

### Reading and modifying a script
```
source = read_script("ServerScriptService/DashHandler")
# Modify source string
write_script("ServerScriptService/DashHandler", modified_source)
```
