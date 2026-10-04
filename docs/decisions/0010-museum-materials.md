> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 0010 · Realistic museum materials (retire the pastel floor tint in 3D)

## Context

Plan 16 asked for the 3D building to read as a real museum. The prototype scene colours every wing floor with the pastel zone `tint` from BLUEPRINT section 4 (light blue, pink, green and so on), which reads as toy-like in WebGL. The `tint` token also feeds the 2D floor plan fills, where pastel zone washes are a normal cartographic convention and genuinely help wayfinding. This decision records the change so the BLUEPRINT section 4 palette stays the source of truth without contradicting the shipped scene.

## Decision

- **`ink` is unchanged and is the wayfinding accent everywhere.** Zone `ink` drives the floor marks (era years), signage, plaques, floor-plan markers and the HUD room accent.
- **`tint` is retained in data but retired in the 3D scene.** In `packages/content/data` and `tools/plan` the `tint` value stays because the 2D floor plan (`FloorMap`, `plan.svg`) still fills each room with its pastel zone wash. The 3D room floors no longer multiply by `tint`.
- **The 3D interior gets a unified, realistic material set** in `packages/scene/src/building/materials.ts` and `Floors.tsx`: warm limestone walls, a warm stone tile floor (uniform across rooms), dark bronze bases and frames, and a neutral paved exterior ground. Wayfinding in 3D comes from the `ink` floor marks and signage, not from floor colour.
- **Lighting warms up** in `packages/scene/src/lighting/Lighting.tsx`: slightly warmer key light, warmer ambient, neutral background and fog so the stone and wood tones land. Baked lightmaps (decision 0005) are unaffected.

## Consequences

- `packages/scene/src/building/Floors.tsx` drops the `r.tint` floor multiply; the room floor material is the same stone across all rooms (the atrium keeps a higher polish).
- The 2D map and `plan.svg` keep the pastel `tint` fills, so the BLUEPRINT section 4 colour table still applies to them.
- Zone `ink` values are untouched; no exhibit, sign or marker changes colour.
