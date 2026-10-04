> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 0005 · Baked lighting for the building shell

## Context

BLUEPRINT §10 names baked lightmaps as the main source of realism, with one or two real-time lights for dynamic shadows only. The prototype faked all of this with a boxed PMREM environment and emissive ceiling panels. Plan 09 introduces the asset pipeline; this decision fixes how the building shell gets its baked light so a layout change can be re-baked identically.

## Decision

- **Shell geometry is regenerated, not hand-modelled.** `tools/plan` emits the static shell from `building.json` to `apps/web/public/lightmap/shell.glb` (`buildShellGlb`). It contains the opaque surfaces only: floor, ceiling (with the atrium hole), solid and exterior walls, lintels and wall bases. Glass is excluded because transparent panes must not occlude the bake.
- **What is baked:** ambient occlusion plus indirect light. The shell mesh carries a `uv2` (TEXCOORD_1) lightmap channel so the bake target is unambiguous; a human does the final unwrap and bake in Blender.
- **What stays real-time:** one shadow-casting directional light that follows the player (exhibit shadows), the emissive ceiling panels, and the spot pool. When a baked atlas is present the hemisphere light and PMREM environment are reduced to near-zero because that indirect light is already in the atlas.
- **Runtime contract:** a committed `apps/web/public/lightmap.json` flag (`enabled`) gates baked lighting. When `enabled` is true the scene loads `/lightmap/atlas.png` and assigns it as `lightMap` on the static wall, floor and ceiling materials, with `lightMapIntensity` 1. This is the hand-off point for plan 13, which replaces the procedural materials' placeholder `uv2` unwrap with the shell exporter's packed unwrap (or loads the baked `shell.glb` directly).

## Bake recipe (repeat after any layout change)

1. `pnpm --filter @museum/plan build:plan` — regenerates `building.json` and `shell.glb`.
2. Import `apps/web/public/lightmap/shell.glb` into Blender.
3. Add a lightmap UV map (rename `uv2` to `Lightmap`), run **Lightmap Pack** (or Smart UV Project) so every island is non-overlapping inside 0..1.
4. Add an image named `Lightmap` at 2048 × 2048. Bake **Combined** or **Diffuse + Ambient Occlusion** with a small extrusion (0.04 m) to avoid seams.
5. Save the image as `apps/web/public/lightmap/atlas.png` (sRGB, no alpha needed).
6. Set `"enabled": true` in `apps/web/public/lightmap.json`.
7. Verify in `/visit`: indirect light should read in corners and under the plinths, with the directional light still casting exhibit shadows.

## Consequences

- `shell.glb` is a generated artefact: never edit it by hand, regenerate after `plan.json` or `building.json` changes.
- The bake is manual work (Blender). Plan 13 owns producing the first real `atlas.png` and aligning the runtime `uv2` with the packed unwrap; until then the scene falls back to the current hemisphere + environment lighting.
- Adding or moving a wall requires re-running the recipe; CI can only assert that `shell.glb` is current, not that the atlas is re-baked.
