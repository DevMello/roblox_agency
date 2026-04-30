# AI Tool Registry

Documents every AI tool supported by `scripts/run-agent.sh`. Update this file before adding a new tool.

---

## Supported Tools

### claude — Anthropic Claude Code CLI

**Install:**
```bash
npm install -g @anthropic-ai/claude-code
```

**Authenticate:** Run `claude` once and follow the browser auth flow. Credentials stored in `~/.claude/`.

**CLI invoked by run-agent.sh:**
```
claude --dangerously-skip-permissions [--model MODEL] -p "PROMPT"
```

**Model env var:** `CLAUDE_MODEL`
**Example models:** `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`
**Auth env var:** None — credentials are in the CLI's own config.

**Notes:** `--dangerously-skip-permissions` suppresses interactive permission prompts, required for autonomous operation.

---

### codex — OpenAI Codex CLI

**Install:**
```bash
npm install -g @openai/codex
```

**Authenticate:** Set `OPENAI_API_KEY` in `.env`.

**CLI invoked by run-agent.sh:**
```
codex --approval-mode full-auto [--model MODEL] -q "PROMPT"
```

**Model env var:** `CODEX_MODEL`
**Example models:** `o4-mini`, `codex-mini-latest`, `gpt-4.1`
**Auth env var:** `OPENAI_API_KEY`

**Notes:** `--approval-mode full-auto` suppresses interactive approval prompts. Released April 2025. Requires Node 18+.

---

### gemini — Google Gemini CLI

**Install:**
```bash
npm install -g @google/gemini-cli
```

**Authenticate:** Set `GEMINI_API_KEY` in `.env` (obtain from Google AI Studio), or run `gemini` once for browser auth.

**CLI invoked by run-agent.sh:**
```
gemini [--model MODEL] -p "PROMPT"
```

**Model env var:** `GEMINI_MODEL`
**Example models:** `gemini-2.5-pro`, `gemini-2.5-flash`
**Auth env var:** `GEMINI_API_KEY`

**Notes:** Free tier available with rate limits. Good choice as secondary/tertiary fallback when Claude quota is exhausted.

---

### opencode — OpenCode CLI

**Install:**
```bash
npm install -g opencode-ai
```

**Authenticate:** Set the API key for your chosen backend (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).

**CLI invoked by run-agent.sh:**
```
opencode [--model MODEL] -p "PROMPT"
```

**Model env var:** `OPENCODE_MODEL` (use provider-prefixed format, e.g. `anthropic/claude-sonnet-4-6`)
**Auth env var:** Provider-dependent.

**Notes:** Open-source, supports multiple backend providers. Useful for cost control via alternative providers.

---

## Adding a New Tool

1. Add a section to this file with install, auth, and CLI flags.
2. Add a `case` branch in `scripts/run-agent.sh` inside `_invoke_tool()`.
3. Add `<TOOLNAME>_MODEL` and auth vars to `.env.example`.
4. Add `AGENT_TOOL_<ROLE>=<toolname>` examples to `.env.example`.
5. Test: `PRIMARY_AI_TOOL=newtool bash scripts/run-architect.sh test-game`

---

## Fallback Chain Behaviour

When a tool exits non-zero for any reason (rate limit, quota, auth failure, binary not on PATH, crash), `run-agent.sh` automatically tries the next tool in the chain:

```
PRIMARY_AI_TOOL (or AGENT_TOOL_<ROLE> override if set)
  → SECONDARY_AI_TOOL   (if set and not a duplicate of primary)
    → TERTIARY_AI_TOOL  (if set and not a duplicate of primary or secondary)
```

Duplicate entries are silently removed. If all tools fail, the calling script receives a non-zero exit code and the error is logged. The calling script then aborts (due to `set -euo pipefail`).

## Per-Agent Overrides

Set `AGENT_TOOL_<ROLE>=<toolname>` in `.env` to route a specific agent role to a different tool than `PRIMARY_AI_TOOL`. This is useful for cost optimisation — e.g. cheaper/faster models for read-only roles like Reporter or Market Researcher, while keeping a powerful model for Builder which writes game code.

| Role key | Agent | Script |
|---|---|---|
| `AGENT_TOOL_ARCHITECT` | Architect | `run-architect.sh` |
| `AGENT_TOOL_PLANNER` | Planner | `launch-night-cycle.sh` |
| `AGENT_TOOL_BUILDER` | Builder (night cycle) | `launch-night-cycle.sh` |
| `AGENT_TOOL_REPORTER` | Reporter | `launch-morning-report.sh` |
| `AGENT_TOOL_MARKET_RESEARCHER` | Market Researcher | `launch-weekly-research.sh` |
| `AGENT_TOOL_WORKER_BUILDER` | Builder (worker mode) | `launch-worker.sh` |
| `AGENT_TOOL_LIVE_EDIT_BUILDER` | Builder (live edit) | `apply-live-edit.sh` |
