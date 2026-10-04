> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** E3
> **Status:** Draft

# 0008 · E3 ships an interim procedural model

## Context

Plan 13 step 5 offers two paths for an exhibit object: a Blender `.blend` exported to a GLB through `pnpm assets:build`, or a procedural React component with a decision note. All 12 built exhibits currently render interim procedural components behind `ModelSlot` (plan 09), with real GLBs intended to replace them one at a time.

## Decision

- E3 ships a procedural component (`packages/scene/src/exhibits/procedural/mouse.tsx`), registered as `E3` in `PROCEDURAL_MODELS`.
- `model.kind` stays `"procedural"` with footprint `"plinth"`. When a real GLB is authored, `model.kind` flips to `"glb"` and `ModelSlot` loads `/models/E3.glb` with no other code change.

## Consequences

- The object is a stylised first mouse: a wooden body, one button, two perpendicular wheels and a cable. It reads clearly at 2.5 m on a 1.3 m plinth.
- No Blender dependency or `assets:build` run is needed to merge this plan.
