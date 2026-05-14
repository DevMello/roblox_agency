# games/

Each game subdirectory is an **external git repository** and is gitignored from the agency repo. The agency tracks games only through `registry.md` — not through their source files.

## How game directories work

- `games/<game-name>/` is a separate git repo cloned or created locally.
- It does **not** appear in `git status` or `git add` from the agency root.
- Only `games/registry.md` is committed to the agency repo.

## Creating a new game

```sh
scripts/new-game.sh <game-name>
```

This initialises a new git repo at `games/<game-name>/`, scaffolds the standard directory layout, and registers the game in `games/registry.md`.

## Cloning an existing game

```sh
scripts/clone-game.sh <game-name> <url>
```

This clones the remote repo into `games/<game-name>/` so the agency can build against it locally.

## Registry

See `games/registry.md` for the canonical list of all active games linked to this agency instance.
