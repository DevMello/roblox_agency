# MCP Server Registry

Registry of every MCP server used by this agency. Agents check this file to determine which server to call for which kind of task.

---

## Server Registry

| Server | Connection | Authorised Agents | Rate Limit | Session Limit |
|--------|-----------|-------------------|------------|--------------|
| Roblox Studio MCP | `localhost:3001` | Builder only | 60 ops/min | 1 concurrent Studio session |
| Blender MCP | `localhost:3002` | Builder only | 30 ops/min | 1 concurrent Blender session |
| Chrome MCP | `localhost:3003` | Builder, Researcher, Market Researcher | 120 req/min | 5 concurrent tabs |
| GitHub MCP | `localhost:3004` | Builder, Planner, QA, Reporter | GitHub API rate limits apply (5000 req/hr) | No session limit |

---

## Server Descriptions

### Roblox Studio MCP (`localhost:3001`)
**Purpose:** Direct manipulation of a running Roblox Studio instance. Enables reading and writing scripts, modifying the Workspace hierarchy, inserting and configuring instances, and triggering playtests.

**Authorised agents:** Builder only. No other agent is permitted to call Roblox Studio MCP directly.

**What it supports:**
- Read and write Luau scripts in ServerScriptService, StarterPlayer, StarterGui, and ReplicatedStorage.
- Read and write Instance properties in Workspace.
- Insert new instances (Parts, Models, Scripts, RemoteEvents, etc.).
- Trigger Studio test mode and read console output.

**What it does not support:** Publishing to Roblox, modifying game metadata (game description, thumbnail), managing assets in the Toolbox.

**Session requirement:** Roblox Studio must be open and connected before the night cycle starts. The pre-flight check in `scripts/launch-night-cycle.sh` verifies this.

---

### Blender MCP (`localhost:3002`)
**Purpose:** Programmatic control of Blender for 3D asset generation and export.

**Authorised agents:** Builder only.

**What it supports:**
- Create and modify meshes via Python API calls.
- Apply materials and basic textures.
- Export scenes or individual objects as FBX or OBJ.
- Batch export multiple objects in a single session.

**Session requirement:** Blender must be open with the MCP add-on enabled. Builder should not assume Blender is open — verify via health check before use.

---

### Chrome MCP (`localhost:3003`)
**Purpose:** Controlled browser access for documentation lookups and site navigation. Not for general browsing.

**Authorised agents:** Builder (documentation only), Researcher (primary user), Market Researcher (chart scraping).

**Permitted sites:**
- `create.roblox.com/docs` — Roblox Creator Documentation
- `devforum.roblox.com` — Roblox DevForum
- `github.com/Roblox` — Roblox official GitHub
- `rolimons.com` — public game statistics (Market Researcher only)
- `rtrack.app` — public analytics (Market Researcher only, if accessible without login)

**Prohibited:** Any site not on the permitted list, any login attempt, any form submission.

---

### GitHub MCP (`localhost:3004`)
**Purpose:** All version control and PR management operations.

**Authorised agents:** Builder (branches, commits, PRs), Planner (read PRs, update labels), QA (PR comments, label changes), Reporter (read PR status).

**What it supports:**
- Create and push branches.
- Commit files with messages.
- Open, update, and close pull requests.
- Add PR labels and comments.
- Read PR diffs, comments, and merge status.
- Check branch protection and merge status.

---

## Auth Reference

Credentials and tokens are stored in environment variables loaded at agent startup. They are never stored in this file or any file tracked by git.

| Server | Credential location |
|--------|-------------------|
| Roblox Studio MCP | Local MCP server config (not in repo) |
| Blender MCP | Local MCP server config (not in repo) |
| Chrome MCP | No auth required for permitted sites |
| GitHub MCP | `GITHUB_TOKEN` environment variable |

---

## Retry and Fallback Policy

### Standard retry
On any MCP call failure, the calling agent waits 5 seconds and retries once. If the retry fails, it applies the fallback below.

### Per-server fallbacks

**Roblox Studio MCP unreachable:**
Builder marks the current task as blocked with type `MCP server issue` in `memory/blockers.md`. It does not attempt to implement the task without Studio. Planner is informed on the next monitoring pass.

**Blender MCP unreachable:**
Builder marks the asset task as blocked. It continues with non-asset tasks in the sprint. The morning report flags the asset task as unstarted.

**Chrome MCP unreachable:**
Researcher marks research as incomplete and returns what it has from its cache. If no cached data exists, it flags the gap to the calling agent. The calling agent decides whether to proceed with reduced information or skip the task.

**GitHub MCP unreachable:**
Builder does not commit or open PRs. All work-in-progress is saved locally. Planner is notified. The night cycle continues running Builder tasks in local-only mode until GitHub MCP recovers. Work is committed in a batch when connectivity is restored.

### Hard abort
If Roblox Studio MCP and GitHub MCP are both unreachable at the start of the night cycle, the pre-flight check aborts the night cycle and notifies via the morning report.
