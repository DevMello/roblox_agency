#!/usr/bin/env bash
# clone-game.sh <game-name> <repo-url>
# Clones an existing game repo into games/<game-name>/ and registers it.
set -euo pipefail
GAME="${1:-}"
URL="${2:-}"
if [[ -z "$GAME" || -z "$URL" ]]; then
  echo "Usage: $0 <game-name> <repo-url>" >&2
  exit 1
fi
if [[ -d "games/$GAME" ]]; then
  echo "Error: games/$GAME already exists" >&2
  exit 1
fi
git clone "$URL" "games/$GAME"
# Register in registry.md
echo "| $GAME | $URL | active |" >> games/registry.md
echo "Cloned $GAME from $URL into games/$GAME/"
