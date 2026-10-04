> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** all
> **Status:** Final

# 0011 · Compact the museum and tighten the floor plan

## Context

After plan 16 shipped, the 3D museum read as too sparse: the wings and concourse had large empty floor voids between exhibits, and walking from one artifact to the next felt long. The building envelope was 98 m x 69 m, generated for a scale of `1 plan px = 0.07 m`. The user asked to pull the artifacts closer together and cut off the empty space.

## Decision

- **Rescale the whole plan by a 0.6x linear factor.** `plan.scale` in `packages/content/data/plan.json` goes from `0.07` to `0.042`, shrinking the envelope to about 59 m x 42 m (a ~64% area reduction). The atrium radius drops from `10.5 m` to `6.3 m` and the exhibit circle from `16.24 m` to `9.744 m`.
- **Make geometry scale-derived, not hardcoded.** `tools/plan/src/generate.ts` replaces its fixed metre offsets with pixel specs multiplied by `scale` (`MARK_INNER_OFFSET_PX = 30`, `MARK_BAND_OFFSET_PX = 16`, `SIGN_INSET_PX = 6`, `DASH_CLEARANCE_PX = 8`), so the plan stays correct under any future rescale.
- **Re-place all 77 exhibits with spacing constraints.** `tools/plan/src/compact.ts` re-derives each exhibit position and facing from its zone and the atrium centre, then spreads connected-component rows along their principal axis with a `2.45 m` interval. Every exhibit pair stays at least `2.4 m` apart and every exhibit stays at least `0.5 m` from room walls.
- **Tighten the 2D floor plan canvas** in `tools/plan/src/svg.ts` and `packages/scene/src/map/projection.ts`. The SVG origin moves from `(+50, +32)` to `(+30, +19)` and the canvas from `1000 x 705 px` to `620 x 440 px`, cropping the empty margin around the smaller building.

## Consequences

- `seed/plan.reference.json` and all generated artifacts (`building.json`, `navmesh.bin`, `standpoints.json`, `plan.svg`, `shell.glb`) are regenerated from the compacted plan.
- Player spawn moves from `z = 34.5` to `z = 20.7` (the new foyer centroid), and fog range in `Lighting.tsx` tightens from `[26, 80]` to `[16, 48]` to match the shorter sightlines.
- Golden tests, navmesh tests, collision tests and exhibit tests update to the new bounds (`x in +/-29.4`, `z in [-18.48, 23.1]`), radii (`ra = 6.3`, `rc = 9.744`) and entrance width (`2.24 m`).
