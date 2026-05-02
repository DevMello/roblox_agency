#!/usr/bin/env bash
# run-agent.sh
# Central AI tool dispatcher. The ONLY script that knows each tool's CLI syntax.
# Source this file to get the run_agent function; do not execute it directly.
#
# Usage (from a caller script):
#   source "${REPO_ROOT}/scripts/run-agent.sh"
#   run_agent "<role>" "$_PROMPT" "$LOG_FILE"
#
# Function signature:
#   run_agent <role> <prompt> [log_file]
#
#   <role>      One of: architect | planner | builder | reporter |
#               market-researcher | worker-builder | live-edit-builder
#   <prompt>    Fully-expanded prompt string — callers must expand all
#               ${VARS} before passing here (assign to a variable first).
#   [log_file]  Optional path. Output is tee'd (append) to this file.
#               If omitted, output goes to stdout only.
#
# Environment variables consumed (all optional; PRIMARY_AI_TOOL defaults to claude):
#   PRIMARY_AI_TOOL              default tool for all roles
#   SECONDARY_AI_TOOL            first fallback on non-zero exit
#   TERTIARY_AI_TOOL             second fallback
#   CLAUDE_MODEL                 --model flag for claude (blank = tool default)
#   CODEX_MODEL                  --model flag for codex
#   GEMINI_MODEL                 --model flag for gemini
#   OPENCODE_MODEL               --model flag for opencode
#   AGENT_TOOL_ARCHITECT         per-role override
#   AGENT_TOOL_PLANNER
#   AGENT_TOOL_BUILDER
#   AGENT_TOOL_REPORTER
#   AGENT_TOOL_MARKET_RESEARCHER
#   AGENT_TOOL_WORKER_BUILDER
#   AGENT_TOOL_LIVE_EDIT_BUILDER
#
# Exit code:
#   0  — at least one tool in the chain succeeded
#   1  — all tools in the chain failed (or no tool found on PATH)

# ─── Idempotency guard ────────────────────────────────────────────────────────
# Safe to source multiple times from the same shell process.
[[ -n "${_RUN_AGENT_LOADED:-}" ]] && return 0
_RUN_AGENT_LOADED=1

# ─── Locate repo root and load .env ──────────────────────────────────────────
_RUN_AGENT_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_RUN_AGENT_REPO_ROOT="$(cd "${_RUN_AGENT_SCRIPT_DIR}/.." && pwd)"

if [[ -f "${_RUN_AGENT_REPO_ROOT}/.env" ]]; then
  # set -a exports every variable assigned below — needed so child tool processes
  # can read OPENAI_API_KEY, GEMINI_API_KEY, etc. without explicit export calls.
  set -a
  # shellcheck source=/dev/null
  source "${_RUN_AGENT_REPO_ROOT}/.env"
  set +a
fi

# ─── Defaults ─────────────────────────────────────────────────────────────────
PRIMARY_AI_TOOL="${PRIMARY_AI_TOOL:-claude}"
SECONDARY_AI_TOOL="${SECONDARY_AI_TOOL:-}"
TERTIARY_AI_TOOL="${TERTIARY_AI_TOOL:-}"

# ─── _resolve_tool_for_role ───────────────────────────────────────────────────
# Returns the tool name to use for a given role.
# Checks AGENT_TOOL_<ROLE> override first; falls back to PRIMARY_AI_TOOL.
_resolve_tool_for_role() {
  local role="$1"
  # e.g. "market-researcher" -> "AGENT_TOOL_MARKET_RESEARCHER"
  local key
  key="AGENT_TOOL_$(echo "$role" | tr '[:lower:]-' '[:upper:]_')"
  local override="${!key:-}"
  if [[ -n "$override" ]]; then
    echo "$override"
  else
    echo "$PRIMARY_AI_TOOL"
  fi
}

# ─── _build_tool_chain ────────────────────────────────────────────────────────
# Outputs a newline-delimited deduplicated list of tools to try.
# primary → SECONDARY_AI_TOOL → TERTIARY_AI_TOOL, duplicates removed.
_build_tool_chain() {
  local primary="$1"
  local seen=()
  local chain=()
  for candidate in "$primary" "$SECONDARY_AI_TOOL" "$TERTIARY_AI_TOOL"; do
    [[ -z "$candidate" ]] && continue
    local already=0
    for s in "${seen[@]+"${seen[@]}"}"; do
      [[ "$s" == "$candidate" ]] && already=1 && break
    done
    if [[ $already -eq 0 ]]; then
      seen+=("$candidate")
      chain+=("$candidate")
    fi
  done
  printf '%s\n' "${chain[@]+"${chain[@]}"}"
}

# ─── _invoke_tool ─────────────────────────────────────────────────────────────
# Invokes a single tool. Returns the tool's exit code (not tee's).
# If log_file is non-empty, pipes through tee -a and captures PIPESTATUS[0].
_invoke_tool() {
  local tool="$1"
  local prompt="$2"
  local log_file="$3"

  local cmd=()
  case "$tool" in
    claude)
      cmd=(claude --dangerously-skip-permissions)
      [[ -n "${CLAUDE_MODEL:-}" ]] && cmd+=(--model "$CLAUDE_MODEL")
      cmd+=(-p "$prompt")
      ;;
    codex)
      # OpenAI Codex CLI — -a never suppresses interactive approval prompts
      cmd=(codex -a never exec)
      [[ -n "${CODEX_MODEL:-}" ]] && cmd+=(--model "$CODEX_MODEL")
      cmd+=("$prompt")
      ;;
    gemini)
      # Google Gemini CLI
      cmd=(gemini)
      [[ -n "${GEMINI_MODEL:-}" ]] && cmd+=(--model "$GEMINI_MODEL")
      cmd+=(-p "$prompt")
      ;;
    opencode)
      # OpenCode — open-source multi-backend CLI
      cmd=(opencode)
      [[ -n "${OPENCODE_MODEL:-}" ]] && cmd+=(--model "$OPENCODE_MODEL")
      cmd+=(-p "$prompt")
      ;;
    *)
      echo "[run-agent] ERROR: Unknown tool '${tool}'. Supported: claude | codex | gemini | opencode" >&2
      return 1
      ;;
  esac

  # Verify binary is on PATH before invoking — produces a clear skip message
  # instead of a confusing "command not found" bash error.
  if ! command -v "${cmd[0]}" >/dev/null 2>&1; then
    echo "[run-agent] WARNING: '${cmd[0]}' not found on PATH — skipping." >&2
    return 1
  fi

  # Execute. When tee is in the pipeline, $? reflects tee's exit (always 0).
  # PIPESTATUS[0] captures the actual tool exit code for fallback decisions.
  if [[ -n "$log_file" ]]; then
    "${cmd[@]}" 2>&1 | tee -a "$log_file"
    return "${PIPESTATUS[0]}"
  else
    "${cmd[@]}"
  fi
}

# ─── run_agent (public) ───────────────────────────────────────────────────────
run_agent() {
  local role="${1:?run_agent: role argument required}"
  local prompt="${2:?run_agent: prompt argument required}"
  local log_file="${3:-}"

  local primary_tool
  primary_tool="$(_resolve_tool_for_role "$role")"

  local -a chain
  mapfile -t chain < <(_build_tool_chain "$primary_tool")

  local attempt=0
  for tool in "${chain[@]}"; do
    attempt=$((attempt + 1))
    if [[ $attempt -gt 1 ]]; then
      echo "[run-agent] Fallback #$((attempt - 1)): trying '${tool}' for role '${role}'" >&2
      [[ -n "$log_file" ]] && echo "[run-agent] Falling back to ${tool}" | tee -a "$log_file" >&2
    else
      echo "[run-agent] Using '${tool}' for role '${role}'" >&2
    fi

    # 'if' protects against set -e aborting on non-zero return
    if _invoke_tool "$tool" "$prompt" "$log_file"; then
      return 0
    fi

    echo "[run-agent] '${tool}' failed for role '${role}' — trying next in chain." >&2
  done

  echo "[run-agent] ERROR: All tools exhausted for role '${role}'." >&2
  return 1
}
