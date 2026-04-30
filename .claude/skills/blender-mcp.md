# Skill: Blender MCP Operations

All 3D asset generation and export for this agency runs through the **Blender MCP server** at `localhost:3002`. Use the patterns in this file when you need to create meshes, apply materials, or export assets for import into Roblox Studio.

**Use Blender only when necessary.** Always check the Roblox Creator Store / marketplace first. Reach for Blender when:
- No library asset is a close enough match for the task requirement
- A custom export would produce a meaningfully better result (unique silhouette, specific topology, art-direction requirement)
- The task spec explicitly calls for a custom asset

Do not use Blender for anything a marketplace asset or Studio primitive can handle adequately. Exercise judgement — closer is good enough in most cases.

Blender must be open with the MCP add-on enabled before the night cycle starts. If the health check fails after one retry, mark the asset task blocked and continue with non-asset tasks.

---

## Health Check

Always verify Blender MCP is reachable before calling any operation:

```bash
curl -sf http://localhost:3002/health
# Exit 0 with {"status":"ok"} means Blender MCP is available
# Any other result: wait 5 s, retry once, then mark task blocked
```

If the health check fails after the retry:
- Mark the task `blocked` with `failure_reason: "Blender MCP unreachable at localhost:3002"`
- Add the blocker to `memory/blockers.md`
- Continue to non-asset tasks in the sprint

---

## Scene Management

### Open or create a scene

```python
# Via Blender MCP execute_luau-equivalent: call the Python API through the MCP
# The MCP exposes a /execute endpoint that runs Blender Python (bpy) commands

# Create a new blank scene
POST http://localhost:3002/execute
{
  "code": "import bpy; bpy.ops.wm.read_factory_settings(use_empty=True)"
}

# Open an existing .blend file
POST http://localhost:3002/execute
{
  "code": "import bpy; bpy.ops.wm.open_mainfile(filepath='/tmp/assets/my-scene.blend')"
}
```

### Save a scene

```python
POST http://localhost:3002/execute
{
  "code": "import bpy; bpy.ops.wm.save_as_mainfile(filepath='/tmp/assets/my-scene.blend')"
}
```

### Clean up after export

Always delete temporary scenes after a successful export to keep Blender's memory clean:

```python
POST http://localhost:3002/execute
{
  "code": "import bpy; bpy.ops.wm.read_factory_settings(use_empty=True)"
}
```

---

## Mesh Generation

### Create a primitive mesh

```python
POST http://localhost:3002/execute
{
  "code": "import bpy; bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,0))"
}
```

### Modify mesh geometry (edit mode)

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy, bmesh
obj = bpy.context.active_object
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(obj.data)
# ... perform bmesh operations ...
bmesh.update_edit_mesh(obj.data)
bpy.ops.object.mode_set(mode='OBJECT')
"""
}
```

### Check polygon count

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy
obj = bpy.context.active_object
poly_count = len(obj.data.polygons)
print(f'Polygon count: {poly_count}')
"""
}
```

**Polygon budget (enforced before every export):**

| Asset type | Max polygons |
|-----------|-------------|
| Background / environmental decoration | 5,000 |
| Interactive objects (chests, doors, pickups) | 10,000 |
| Character accessories or hero props | 20,000 |
| Hard limit — any single asset | 50,000 |

If the polygon count exceeds the budget, apply a Decimate modifier before exporting:

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy
obj = bpy.context.active_object
mod = obj.modifiers.new(name='Decimate', type='DECIMATE')
mod.ratio = 0.5   # adjust until within budget
bpy.ops.object.modifier_apply(modifier='Decimate')
"""
}
```

---

## Material Application

### Create and assign a basic material

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy
mat = bpy.data.materials.new(name='AssetMaterial')
mat.use_nodes = True
# Set base colour via Principled BSDF
bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.8, 0.6, 0.2, 1.0)  # RGBA

obj = bpy.context.active_object
if obj.data.materials:
    obj.data.materials[0] = mat
else:
    obj.data.materials.append(mat)
"""
}
```

### Apply a texture image

**Texture budget:**

| Map type | Max resolution |
|---------|---------------|
| Diffuse (Base Color) | 1024×1024 px |
| Normal / Roughness | 512×512 px |
| Hard limit — any texture | 2048×2048 px |

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy
mat = bpy.context.active_object.active_material
nodes = mat.node_tree.nodes
links = mat.node_tree.links

tex_node = nodes.new('ShaderNodeTexImage')
tex_node.image = bpy.data.images.load('/tmp/textures/diffuse.png')

bsdf = nodes['Principled BSDF']
links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
"""
}
```

---

## Export

### Export as FBX (preferred for Roblox import)

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy
bpy.ops.export_scene.fbx(
    filepath='/tmp/exports/asset-name.fbx',
    use_selection=True,
    apply_scale_options='FBX_SCALE_ALL',
    axis_forward='-Z',
    axis_up='Y',
    bake_space_transform=True
)
"""
}
```

### Export as OBJ (fallback)

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy
bpy.ops.export_scene.obj(
    filepath='/tmp/exports/asset-name.obj',
    use_selection=True,
    axis_forward='-Z',
    axis_up='Y'
)
"""
}
```

### Batch export multiple objects

```python
POST http://localhost:3002/execute
{
  "code": """
import bpy, os
export_dir = '/tmp/exports/'
os.makedirs(export_dir, exist_ok=True)

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    out_path = os.path.join(export_dir, f'{obj.name}.fbx')
    bpy.ops.export_scene.fbx(
        filepath=out_path,
        use_selection=True,
        apply_scale_options='FBX_SCALE_ALL',
        axis_forward='-Z',
        axis_up='Y',
        bake_space_transform=True
    )
"""
}
```

---

## Error Handling

### Verify export succeeded

After every export call, check the output file exists and is non-empty:

```bash
test -s /tmp/exports/asset-name.fbx && echo "OK" || echo "EXPORT FAILED"
```

### Import failure recovery

If a Blender-generated asset fails to import into Roblox Studio after one retry:
1. Reduce mesh complexity by 25% using the Decimate modifier (see above) and retry once.
2. If it still fails, mark the task `failed` in the sprint log with `failure_reason: "asset import failed after retry — Blender export or Studio import error"`.
3. Add to `memory/blockers.md` and open a draft PR for any partial work.

---

## What Builder Never Does with Blender MCP

- Never leaves temporary `.blend` files on disk after a successful export — always run the cleanup scene reset.
- Never exceeds polygon or texture budgets — check before exporting, not after.
- Never calls Blender MCP without a health check first.
- Never uses Blender MCP for non-asset tasks (scripting, UI, game logic — those are Roblox Studio MCP only).
- Never assumes Blender is open — the session requirement must be verified via the health check.

---

## Blender MCP Health Check (Pre-flight)

The night cycle pre-flight (`scripts/launch-night-cycle.sh`) checks Blender MCP alongside Roblox Studio MCP and gh. If the check fails:
- Sprint tasks of type `asset` are marked `blocked` before the night begins.
- Non-asset tasks proceed normally.
- The morning report flags all asset tasks as unstarted due to Blender MCP unavailability.
