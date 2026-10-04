# Exhibit model spec (Blender → GLB)

Modelling brief for the 12 built exhibits (and the 25 Core exhibits in plan 13). This is the contract between the artist/agent producing `.blend` files and the asset pipeline in `tools/assets`.

> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) §7, §10. If this file disagrees with BLUEPRINT, BLUEPRINT wins.

## Coordinates and units

- **Units:** metres. One Blender unit = 1 m.
- **Up:** +Y. Gravity points to -Y.
- **Front:** the exhibit faces +Z (toward the visitor, along `position.face` in `exhibits.json`).
- **Origin:** the object's **base centre** at `(0, 0, 0)`, sitting on the stand top. Do not model the plinth/platform: the scene supplies it from the footprint in `exhibits.json`.

## Footprint limits

The object must fit inside its stand footprint. The footprint lives in `exhibits.json` (`model.footprint` and the `footprint` object); the allowed object extents are:

| Footprint | Stand size (content) | Object max extent (W × D) | Max object height |
| --------- | -------------------- | ------------------------- | ----------------- |
| `plinth`  | 1.3 × 1.3 m          | ≤ 1.2 × 1.2 m             | 1.6 m above the stand top |
| `floor`   | 2.3 × 2.0 m          | ≤ 2.3 × 2.0 m             | 2.2 m above the floor |

The runtime raises each object to `modelBaseY(footprint)` automatically, so leave the object's base at `y = 0` in the source file.

## Budgets (enforced by `pnpm assets:build`)

One GLB per exhibit object. The optimiser rejects a file that exceeds any of these:

| Limit | Value |
| ----- | ----- |
| Triangles | ≤ 30,000 per object |
| File size | ≤ 1.5 MB (`.glb`, after optimisation) |
| Texture size | ≤ 2048 px on the longest edge |
| Materials | ≤ 2 per object (plus named emissive materials, see below) |

## Materials

- Keep the material count low. One `Body` material plus one accent material is typical.
- **Emissive parts** (tubes, LEDs, screens, dials) must be their own **named** materials so the runtime can animate them:

  - `emissive_tubes` — vacuum tubes / valves (ENIAC, transistor-era hardware)
  - `emissive_leds` — LEDs, indicator lamps
  - `screen` — CRT / LCD screens that can show content

  Name the Blender material (and the exported GLB material) exactly these strings. The loader matches by name, so the GLB must preserve the material name through export.

## Textures

- **Format:** KTX2 for colour maps (Basis Universal). The pipeline re-encodes in plan 13; for now source PNG/WEBP at ≤ 2048 px is accepted.
- Colour maps are sRGB; normal/roughness/occlusion maps are linear.
- Bake any high-poly detail into a normal map rather than adding geometry.

## Export checklist

1. Apply scale + rotation so +Y is up and +Z is front.
2. Move the object so its base centre is the origin.
3. Join to the fewest sensible objects; delete hidden/unused meshes.
4. Confirm triangle count and texture sizes are inside budget.
5. Export `glTF Binary (.glb)`, write to `assets/out/<ID>.glb` (uppercase ID, e.g. `B2.glb`).
6. Run `pnpm assets:build`; fix any over-budget failure it reports.
7. Set `model.kind` to `"glb"` for that exhibit in `packages/content/data/exhibits.json`.

With `model.kind: "glb"` and the GLB at `apps/web/public/models/<ID>.glb`, the scene loads it in place of the interim procedural model, with no change to `ModelSlot` or the procedural registry.
