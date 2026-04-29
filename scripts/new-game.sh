#!/usr/bin/env bash
# new-game.sh
# Sets up a new game from the spec template and runs the Architect
# to generate the full milestone plan.
#
# Usage:
#   ./scripts/new-game.sh <game-name>
#
# Example:
#   ./scripts/new-game.sh sword-game
#
# What it does:
#   1. Creates specs/<game-name>/spec.md from the template
#   2. Opens it in your editor so you can fill it in
#   3. Once you save and exit, runs the Architect to generate games/<game-name>/plan.md

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GAME="${1:?Usage: ./scripts/new-game.sh <game-name>}"

# Validate name: lowercase letters, numbers, hyphens only
if ! echo "$GAME" | grep -qE '^[a-z0-9-]+$'; then
  echo "ERROR: Game name must be lowercase letters, numbers, and hyphens only."
  echo "       Got: '${GAME}'"
  exit 1
fi

SPEC_DIR="specs/${GAME}"
SPEC_FILE="${SPEC_DIR}/spec.md"
GAMES_DIR="games/${GAME}"

# ─── Create spec from template ───────────────────────────────────────────────

if [[ -f "$SPEC_FILE" ]]; then
  echo "Spec already exists at ${SPEC_FILE}"
  echo "Run ./scripts/run-architect.sh ${GAME} to (re)generate the plan."
  exit 0
fi

mkdir -p "$SPEC_DIR"
cp specs/template.md "$SPEC_FILE"
echo ""
echo "Created: ${SPEC_FILE}"
echo ""
echo "Fill in the spec now. Every section matters — Architect reads all of them."
echo "The most important sections are:"
echo "  - Core game loop (what the player does every 30s / 5min / session)"
echo "  - Feature list (each feature becomes tasks in the plan)"
echo "  - Technical constraints (required Roblox services)"
echo "  - Out of scope (prevents scope creep)"
echo ""

# Open in editor if one is set
EDITOR="${EDITOR:-}"
if [[ -n "$EDITOR" ]]; then
  "$EDITOR" "$SPEC_FILE"
elif command -v code &>/dev/null; then
  code "$SPEC_FILE"
  echo "Opened in VS Code. Save and close when done, then run:"
  echo "  ./scripts/run-architect.sh ${GAME}"
  exit 0
else
  echo "Open ${SPEC_FILE} in any editor, fill it in, then run:"
  echo "  ./scripts/run-architect.sh ${GAME}"
  exit 0
fi

# If editor exited (e.g. vim/nano), offer to run Architect immediately
echo ""
echo "Spec saved. Run the Architect now to generate the plan? (y/n)"
read -r CONFIRM
if [[ "$CONFIRM" == "y" ]]; then
  bash "${REPO_ROOT}/scripts/run-architect.sh" "$GAME"
fi
