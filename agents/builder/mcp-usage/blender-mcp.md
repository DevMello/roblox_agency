# Builder Guide: Blender MCP

Internal guide for using the Blender MCP server for 3D asset creation and export.

---

## Connection

**URL:** `localhost:3002`

Always verify connection before use:
```
health_check → should return { "status": "ok", "blender_version": "4.x" }
```

If the health check fails, Blender is not running or the MCP add-on is not enabled. Mark the asset task blocked. Do not attempt any Blender operations.

---

## Opening Blender and Creating a Scene

### Create a new scene
```
new_scene(name) — creates a new Blender scene with the given name
```
Always start asset work in a fresh scene. Do not modify an existing scene that contains other assets.

### Delete default objects
```
delete_object("Cube")
delete_object("Light")
delete_object("Camera")
```
The default scene includes a cube, light, and camera. Delete all three before adding your asset.

---

## Standard Export Pipeline

Export format for Roblox import: **FBX** (preferred) or **OBJ** (fallback if FBX fails).

### Single asset export
```
export_fbx(
  object_names: ["MyAsset"],
  filepath: "/tmp/exports/my_asset.fbx",
  scale: 0.01  # Roblox uses studs; Blender default is meters
)
```

Scale note: Roblox Studio imports FBX at 1 meter = 1 stud. Set scale to `0.01` in the export call if your Blender mesh is modelled at centimeter scale, or model in meters directly.

### Batch export
To export multiple assets from one Blender session:
```
for each asset in asset_list:
    select_object(asset.name)
    export_fbx(
        object_names: [asset.name],
        filepath: f"/tmp/exports/{asset.name}.fbx",
        scale: 0.01
    )
```

Batch in a single session whenever possible — Blender MCP sessions have a session limit, so minimise session count.

---

## Polygon Budget Guidelines

| Asset type | Max polygons |
|-----------|-------------|
| Background / environmental decoration | 5,000 |
| Interactive object | 10,000 |
| Character accessory / hero prop | 20,000 |
| Absolute maximum for any asset | 50,000 |

To check polygon count:
```
get_stats(object_name) → { "polygons": 3420, "vertices": 1840 }
```

If a mesh exceeds budget:
```
apply_decimate(object_name, ratio=0.5)  # reduces polygons by 50%
```
Decimate in 0.1 increments until within budget. Do not go below ratio 0.2 in a single step — this can produce broken geometry.

---

## Texture Size Limits

- Diffuse (colour) texture: max 1024×1024
- Normal map: max 512×512
- Roughness/metallic map: max 512×512
- Do not exceed 2048×2048 for any texture

---

## Known Operations That Fail via MCP

These operations are unreliable or unsupported via the MCP server. Do not attempt them:

- **Sculpt mode operations** — use mesh modelling instead.
- **Particle systems** — not exportable to FBX.
- **Physics simulations** — results are not deterministic over MCP.
- **Rendering** — not needed for Roblox assets.
- **Geometry nodes with complex inputs** — use basic modifier stack instead.

---

## Cleanup After Export

After all exports are complete and confirmed imported into Roblox Studio:
```
delete_scene(name)   # delete the working scene
```

Delete temp export files:
```
delete_file("/tmp/exports/my_asset.fbx")
```

Do not leave Blender scenes or temp files that accumulate across sessions.
