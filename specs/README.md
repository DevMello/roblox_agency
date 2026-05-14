# specs/

This directory holds only the canonical spec template (`template.md`).

Game specs formerly lived at `specs/{game-name}/spec.md`. They now live in each
game's external repository at `games/{game-name}/spec.md`.

To create a new game:
```bash
./scripts/new-game.sh <game-name>
```
This initializes an external git repo at `games/<game-name>/` with a spec template ready to fill in.
