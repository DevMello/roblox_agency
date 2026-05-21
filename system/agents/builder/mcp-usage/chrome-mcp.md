# Builder Guide: Chrome MCP

Internal guide for using Chrome MCP. Builder has restricted access — documentation lookup only.

---

## When Builder Uses Chrome MCP

Builder may use Chrome MCP only for:
1. Looking up a Roblox API page when implementing a task that requires it.
2. Finding a DevForum post that documents a specific pattern or known issue.

Builder may NOT use Chrome MCP for:
- General web browsing.
- Any site not on the authorised list (see `agents/researcher/sources.md`).
- Market research (that is Market Researcher's role).
- Competitive analysis (that is Researcher's role).

If Builder needs research that goes beyond a quick documentation lookup, it should call Researcher instead of using Chrome MCP directly.

---

## Navigating to Roblox Creator Docs

The most efficient way to find an API reference page:

```
navigate("https://create.roblox.com/docs/reference/engine/classes/{ClassName}")
```

For example:
```
navigate("https://create.roblox.com/docs/reference/engine/classes/Humanoid")
```

If you don't know the exact class name, use the search:
```
navigate("https://create.roblox.com/docs/search?q={search term}")
```

Then follow the most relevant link in the results.

---

## Searching DevForum

For DevForum searches:
```
navigate("https://devforum.roblox.com/search?q={search term}&category=scripting-support")
```

For resource posts specifically:
```
navigate("https://devforum.roblox.com/search?q={topic}&category=resources")
```

After navigating to a search results page, read the titles and dates of the top results. Click into the most recent relevant post (2023 or later preferred). Read the first post and the first accepted solution or highest-voted reply.

---

## Extracting a Code Snippet

After navigating to a page that contains relevant code:
```
extract_text(selector="pre code")   # extracts all code blocks on the page
```

Or read the full page text and identify the relevant code block manually.

Return only the relevant snippet — do not return full page text.

---

## Login-Required Pages

If a page asks for login:
- Do not attempt to log in.
- Do not fill in any form.
- Return: "source unavailable — login required at {URL}."
- Try an alternative URL (e.g. a different page on the same documentation site) that covers the same topic.

---

## Tab Management

Chrome MCP allows up to 5 concurrent tabs. Builder should never need more than 2 tabs at a time for documentation lookups.

Close tabs after use:
```
close_tab(tab_id)
```

Do not leave tabs open at the end of a task.
