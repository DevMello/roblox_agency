#!/usr/bin/env bash
# new-game.sh <game-name>
# Creates a new game as an external git repo under games/<game-name>/ and registers it.
#
# Usage:
#   ./scripts/new-game.sh <game-name>
#
# Example:
#   ./scripts/new-game.sh sword-game
#
# What it does:
#   1. Validates the game name and checks it doesn't already exist
#   2. Initialises a new git repo at games/<game-name>/
#   3. Copies the game-repo-template and substitutes [GAME NAME] placeholders
#   4. Makes an initial commit inside the new repo
#   5. Registers the game in games/registry.md
#   6. Prints next-step instructions

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GAME="${1:-}"
if [[ -z "$GAME" ]]; then
  echo "Usage: $0 <game-name>" >&2
  exit 1
fi

# Validate name: lowercase letters, numbers, hyphens only
if ! echo "$GAME" | grep -qE '^[a-z0-9-]+$'; then
  echo "ERROR: Game name must be lowercase letters, numbers, and hyphens only." >&2
  echo "       Got: '${GAME}'" >&2
  exit 1
fi

GAME_DIR="games/${GAME}"

if [[ -d "$GAME_DIR" ]]; then
  echo "Error: ${GAME_DIR} already exists" >&2
  exit 1
fi

# ─── Initialise external git repo ────────────────────────────────────────────

git init "$GAME_DIR"

# Copy template files
cp -r scripts/game-repo-template/. "$GAME_DIR/"

# Replace [GAME NAME] placeholder in all copied files
find "$GAME_DIR" -type f | while IFS= read -r file; do
  sed -i "s/\[GAME NAME\]/${GAME}/g" "$file"
done

# Initial commit inside the game repo
(cd "$GAME_DIR" && git add -A && git commit -m "Initial commit: ${GAME} game repo")

# ─── Register in registry.md ─────────────────────────────────────────────────

echo "| ${GAME} | (local only) | active |" >> games/registry.md

# ─── Instructions ────────────────────────────────────────────────────────────

echo ""
echo "Created game repo at ${GAME_DIR}/"
echo ""
echo "Next steps:"
echo "  1. Push to GitHub:"
echo "       cd ${GAME_DIR}"
echo "       git remote add origin <repo-url>"
echo "       git push -u origin main"
echo "  2. Run the Architect to generate the plan:"
echo "       ./scripts/run-architect.sh ${GAME}"
