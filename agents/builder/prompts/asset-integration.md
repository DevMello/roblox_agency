# Prompt: Asset Integration

You are the Builder agent. You are integrating a 3D asset (created by Blender MCP or sourced from the Roblox marketplace) into the game. This prompt covers the full pipeline from model to in-game placement.

---

## Step 1: Source the Asset

### If generating via Blender MCP
1. Verify Blender MCP is reachable (health check before calling any operation).
2. Create or open the appropriate scene.
3. Generate or modify the mesh according to the task specification.
4. **Polygon budget guidelines:**
   - Background / environmental decoration: max 5,000 polygons
   - Interactive objects (chests, doors, pickups): max 10,000 polygons
   - Character accessories or hero props: max 20,000 polygons
   - Never exceed 50,000 polygons for any single asset
5. **Texture budget:**
   - Diffuse texture: max 1024×1024 pixels
   - Normal/roughness map: max 512×512 pixels
   - Do not use textures above 2048×2048 under any circumstances
6. Export as FBX (preferred) or OBJ to a temporary directory.
7. Clean up: delete the temporary Blender scene after successful export.

### If sourcing from Roblox marketplace
1. Confirm the asset ID from the Researcher shortlist (from `asset-research` prompt output).
2. Verify the asset is still available and free by checking the marketplace page via Chrome MCP.
3. Note the asset ID for the import step.

---

## Step 2: Import via Roblox Studio MCP

1. Connect to Roblox Studio MCP and verify the game file is open.
2. Import the asset:
   - FBX/OBJ: use the import command to bring the mesh into the game.
   - Marketplace asset: insert by asset ID.
3. Verify the import succeeded — check that the instance appears in the Workspace or in the designated folder.

---

## Step 3: Position and Configure

1. **Naming:** Name the imported instance using the convention `{Category}_{AssetName}` (e.g. `Environment_ArenaFloor`, `Weapon_Sword_Base`). Use PascalCase.
2. **Hierarchy:** Place the asset in the correct folder:
   - Environment assets: `Workspace/Environment/`
   - Character assets: `Workspace/Characters/` or `StarterCharacter/`
   - UI-adjacent 3D elements: `Workspace/UI3D/`
   - Weapons/tools: `Workspace/Items/`
   - If the correct folder doesn't exist, create it.
3. **Collision:** Set `CollisionFidelity` appropriate to the asset type. Interactive objects: `Box` or `Hull`. Background props: `Disabled` if not walkable.
4. **Anchoring:** Anchor static environmental assets (`Anchored = true`). Do not anchor dynamic objects.
5. **Tags:** Add a `CollectionService` tag to the asset so QA can identify it:
   - Format: `Asset_{Category}_{AssetName}` (e.g. `Asset_Environment_ArenaFloor`)

---

## Step 4: Handle Import Failure

If the import fails after one retry:
1. If the asset is from Blender: reduce mesh complexity by 25% and retry once. If it still fails, flag for human.
2. If the asset is from the marketplace: try an alternative asset from the Researcher shortlist. If no alternative exists, flag for human.
3. To flag: mark the task `failed` in the sprint log with `failure_reason: "asset import failed after retry"`. Add to `memory/blockers.md`.

---

## Step 5: Commit and PR

1. Save the scene via Roblox Studio MCP, then commit with `git` and message: `[{game-slug}] asset: {asset name} imported and positioned`
2. Run the `pr-creation` prompt.
3. Update the sprint log and `progress.md`.
