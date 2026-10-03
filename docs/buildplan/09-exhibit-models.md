> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** A1, B2, B3, B11, C1, C3, C10, D6, D7, F2, F7, F10
> **Status:** Ready
> **Depends on:** 07

# 09 · Exhibit models and asset pipeline

## Goal

A repeatable path from Blender to an optimised GLB in the scene, plus baked lighting for the building. The 12 built exhibits get interim procedural models (ported from the prototype) behind the same loader, so real GLBs can replace them one at a time without code changes.

## Read first

- BLUEPRINT §7 (Object row: footprint limits), §10 (Assets, Lighting, budget)
- Prototype builder functions `B.eniac`, `B.plug`, `B.turing`, `B.transistor`, `B.card`, `B.chalk`, `B.next`, `B.html`, `B.chess`, `B.rack`, `B.tower`, `B.transformer`

## Deliverables

```
assets/src/<ID>.blend                      (added over time, not required in this PR)
tools/assets/optimize.ts                   gltf-transform: dedup, prune, meshopt or draco, KTX2 textures
packages/scene/src/exhibits/ModelSlot.tsx  loads public/models/<ID>.glb if present, else procedural
packages/scene/src/exhibits/procedural/<id>.tsx   12 interim models ported from the prototype
packages/content: exhibit.model { kind: 'glb'|'procedural', footprint: 'plinth'|'floor' }
docs/assets/model-spec.md                  modelling brief for artists and agents
docs/decisions/NNNN-lighting.md
```

## Steps

1. **Model spec** (`docs/assets/model-spec.md`): metres, +Y up, front faces +Z, origin at base centre; plinth objects ≤ 1.2 m wide, floor objects ≤ 2.3 × 2.0 m; ≤ 30k triangles each; ≤ 2 materials; textures ≤ 2048 px, KTX2; emissive parts (tubes, LEDs, screens) as separate named materials so the runtime can animate them.
2. **Optimiser:** `pnpm assets:build` reads `assets/out/*.glb`, writes `apps/web/public/models/<ID>.glb`, and fails if a file exceeds 1.5 MB or the triangle budget.
3. **ModelSlot:** `useGLTF` with Meshopt/Draco/KTX2 loaders configured once; falls back to the procedural component; animation hooks find emissive materials by name (`emissive_tubes`, `emissive_leds`, `screen`).
4. **Port the 12 procedural builders** to R3F components, same dimensions and animations as the prototype. They are interim, but must look identical.
5. **Baked lighting:** export the building shell from `building.json` to glTF (`tools/plan` can emit it), bake ambient occlusion + indirect light in Blender to a lightmap atlas, load it as `lightMap` on the static wall and floor materials. Keep the directional light only for exhibit shadows. Document the bake steps so they can be repeated after a layout change.

## Acceptance criteria

- [ ] All 12 built exhibits render via `ModelSlot` (procedural fallback) identical to the prototype screenshots.
- [ ] Dropping a test GLB at `public/models/B2.glb` replaces ENIAC with no code change.
- [ ] Optimiser rejects an over-budget file with a clear message (test fixture).
- [ ] Lightmap bake applied to the building shell; screenshots before/after in the PR.
- [ ] Busiest view still under 400 draw calls on `high`.

## Out of scope

Modelling the real Blender assets themselves (that is per-exhibit work under plan 13), placeholders for unbuilt exhibits (07 owns them).

## Verify

```bash
pnpm assets:build
pnpm --filter @museum/scene test
pnpm --filter web test:e2e -- visit.spec.ts
```

## Handoff

List which exhibits are still procedural; plan 13 tracks replacing them.
