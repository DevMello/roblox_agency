# Researcher — Trusted Sources

Curated list of sources Researcher is authorised to consult. All sources must be accessed via Chrome MCP. Do not access any source not on this list.

---

## Primary Sources

### Roblox Creator Documentation
- **URL:** https://create.roblox.com/docs
- **Reliability:** Authoritative. Always prefer this over any other source.
- **Access:** No login required for public docs.
- **Notes:** Some advanced topics (monetisation APIs, compliance) require scrolling past marketing content. Check the API reference section, not the tutorial sections, for method signatures.

### Roblox DevForum
- **URL:** https://devforum.roblox.com
- **Reliability:** High for recent posts (last 12 months). Older posts may reference deprecated APIs.
- **Access:** Browsing does not require login. Do not attempt to log in or post.
- **Notes:** Filter by "scripting support" and "resources" categories. Sort by Recent Activity when looking for current patterns. Check the post date — always prefer posts from 2023 or later.

### Roblox GitHub Organisation
- **URL:** https://github.com/Roblox
- **Reliability:** High. Official Roblox tooling and open-source libraries.
- **Access:** Public repos require no login.
- **Key repos:** `luau`, `roact`, `rodux`, `roblox-ts`, `testez`

---

## Community-Trusted Open Source Repos

These are well-maintained community repos that consistently follow current best practices:

| Repo | URL | Topic |
|------|-----|-------|
| Knit framework | https://github.com/Sleitnick/Knit | Service/controller pattern for client-server code |
| Wally package manager | https://github.com/UpliftGames/wally | Roblox package management |
| Rojo | https://github.com/rojo-rbx/rojo | File-based Roblox sync |
| DataStore2 | https://github.com/Kampfkarren/Roblox | DataStore with automatic retry and caching |
| ProfileService | https://github.com/MadStudioRoblox/ProfileService | Player data persistence |

When using community repos, verify the last commit date. If the repo has not been updated in 18+ months and touches core APIs, treat it as potentially outdated and verify the APIs against official docs.

---

## Sources to Avoid

The following sources are unreliable, outdated, or SEO-gamed and must NOT be used:

- **wiki.roblox.com** — deprecated. All content has been migrated to `create.roblox.com/docs`.
- **robloxdev.com** — unofficial, often outdated mirror.
- Any blog post or YouTube tutorial without a verifiable author and publish date.
- Any site that requires creating an account to read the content.
- Any site whose content is primarily AI-generated summaries of Roblox documentation.

---

## Login-Required Sources

If a source that appears on the authorised list requires login to view specific content:
- Do not attempt to log in.
- Mark the specific page as `login-required` in the research note.
- Try to find the same information via a different page on the same site (e.g. try the API reference page instead of a tutorial page).
- If no public version of the information exists, return "source unavailable — login required" in the research note.
