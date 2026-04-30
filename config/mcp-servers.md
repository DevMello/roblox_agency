# MCP Server Registry

Registry of every MCP server used by this agency. Agents check this file to determine which server to call for which kind of task.

---

## Server Registry

| Server | Connection | Authorised Agents | Rate Limit | Session Limit |
|--------|-----------|-------------------|------------|--------------|
| Roblox Studio MCP | `%LOCALAPPDATA%\Roblox\mcp.bat` (batch file) | Builder only | 60 ops/min | 1 concurrent Studio session |
| Blender MCP | `localhost:3002` | Builder only | 30 ops/min | 1 concurrent Blender session |
| Chrome MCP | `localhost:3003` | Builder, Researcher, Market Researcher | 120 req/min | 5 concurrent tabs |

---

## Server Descriptions

### Roblox Studio MCP (`%LOCALAPPDATA%\Roblox\mcp.bat`)
**Purpose:** Direct manipulation of a running Roblox Studio instance. Enables reading and writing scripts, modifying the Workspace hierarchy, inserting and configuring instances, and triggering playtests.

**Connection method:** The official Roblox MCP server is invoked via a batch file installed by Roblox Studio at `%LOCALAPPDATA%\Roblox\mcp.bat`. This is configured in `.mcp.json` at the repo root — no localhost server is needed. Roblox Studio must be open for the MCP to function.

**Authorised agents:** Builder only. No other agent is permitted to call Roblox Studio MCP directly.

**What it supports:**
- Read and write Luau scripts in ServerScriptService, StarterPlayer, StarterGui, and ReplicatedStorage.
- Read and write Instance properties in Workspace.
- Insert new instances (Parts, Models, Scripts, RemoteEvents, etc.).
- Trigger Studio test mode and read console output.

**What it does not support:** Publishing to Roblox, modifying game metadata (game description, thumbnail), managing assets in the Toolbox.

**Session requirement:** Roblox Studio must be open before the night cycle starts. The pre-flight check in `scripts/launch-night-cycle.sh` verifies the batch file exists at `%LOCALAPPDATA%\Roblox\mcp.bat`.

---

### Blender MCP (`localhost:3002`)
**Purpose:** Programmatic control of Blender for 3D asset generation and export.

**Authorised agents:** Builder only.

**Skill reference:** See `.claude/skills/blender-mcp.md` for the full operation reference — health check, scene management, mesh generation, material application, FBX/OBJ export, polygon/texture budgets, batch export, and error-handling patterns.

**What it supports:**
- Create and modify meshes via Python (`bpy`) API calls.
- Apply materials and basic textures.
- Export scenes or individual objects as FBX (preferred) or OBJ.
- Batch export multiple objects in a single session.

**Polygon budget (enforced by Builder before every export):**
- Background / environmental decoration: max 5,000 polygons
- Interactive objects: max 10,000 polygons
- Character accessories or hero props: max 20,000 polygons
- Hard limit — any single asset: 50,000 polygons

**Texture budget:**
- Diffuse texture: max 1024×1024 px
- Normal/roughness map: max 512×512 px
- Hard limit — any texture: 2048×2048 px

**Health check:** `curl -sf http://localhost:3002/health` — must return `{"status":"ok"}` before use.

**Session requirement:** Blender must be open with the MCP add-on enabled. Builder must not assume Blender is open — run the health check before every asset task. The night cycle pre-flight also checks this at startup.

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

---

## Auth Reference

Credentials and tokens are stored in environment variables loaded at agent startup. They are never stored in this file or any file tracked by git.

| Server | Credential location |
|--------|-------------------|
| Roblox Studio MCP | Local MCP server config (not in repo) |
| Blender MCP | Local MCP server config (not in repo) |
| Chrome MCP | No auth required for permitted sites |
| GitHub CLI (`gh`) | `gh auth login` — token stored by gh credential helper. Run `gh auth status` to verify. |

---

## Retry and Fallback Policy

### Standard retry
On any MCP call failure, the calling agent waits 5 seconds and retries once. If the retry fails, it applies the fallback below.

### Per-server fallbacks

**Roblox Studio MCP unavailable:**
Builder marks the current task as blocked with type `MCP server issue` in `memory/blockers.md`. "Unavailable" means either the batch file at `%LOCALAPPDATA%\Roblox\mcp.bat` is missing or Roblox Studio is not open. Builder does not attempt to implement the task without Studio. Planner is informed on the next monitoring pass.

**Blender MCP unreachable:**
Builder marks the asset task as blocked. It continues with non-asset tasks in the sprint. The morning report flags the asset task as unstarted.

**Chrome MCP unreachable:**
Researcher marks research as incomplete and returns what it has from its cache. If no cached data exists, it flags the gap to the calling agent. The calling agent decides whether to proceed with reduced information or skip the task.

**`gh` CLI unreachable or unauthenticated:**
Run `gh auth status` to diagnose. If GitHub is unreachable (network) or the token is invalid, Builder does not open PRs. All work is committed locally on the branch. Planner is notified. Night cycle continues in local-only mode; the morning report flags the issue for human follow-up.

### Hard abort
If Roblox Studio MCP is unavailable (batch file missing) and `gh auth status` also fails at the start of the night cycle, the pre-flight check aborts the night cycle and notifies via the morning report.
