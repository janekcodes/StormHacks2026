> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final
> **Depends on:** 16, decision 12

# 17 · Heritage museum environment

## Goal

Make the walkable building read as a real heritage museum: textured stone, marble and parquet floors, panelled walls with cornice and architraves, a coffered ceiling, proper vitrines, pedestals and stanchions, brass plaques, real furniture, image-based lighting with ambient occlusion and focused gallery spot lighting, and artifact models with real materials. Stay inside the BLUEPRINT section 10 performance budget.

## Read first

- BLUEPRINT §5 (3D scale), §10 (stack, performance budget)
- Decisions 0005 (lighting), 0010 (materials), 0011 (compaction), 0012 (heritage direction)

## Deliverables

```
tools/assets/src/textures.ts            CC0 download + pack (albedo, normal, ORM) to WebP 1024/512
tools/assets/src/generate.ts            PBR kit materials, no self-emission, bevelled detail
apps/web/public/textures/*.webp         packed texture sets + CREDITS.md
apps/web/public/models/*.glb            regenerated artifact models
packages/scene/src/building/textures.ts tier-aware lazy texture loader with flat fallbacks
packages/scene/src/building/materials.ts one shared, cached material library
packages/scene/src/building/Walls.tsx   wainscot, chair rail, skirting, cornice, architraves, frieze
packages/scene/src/building/Floors.tsx  stone / marble / parquet floors, coffered ceiling, skylight, sky
packages/scene/src/building/Atrium.tsx  benches, reception desk, shop, planters
packages/scene/src/building/Signage.tsx backed walnut signs, font wait
packages/scene/src/lighting/*           Lightformer environment, key light, postprocessing
packages/scene/src/exhibits/*           vitrines, pedestals, daises, stanchions, plaque atlas
packages/scene/src/quality.ts           per-tier feature flags
```

## Steps

1. Texture pipeline and loader; flat colours remain until maps arrive.
2. One material library used by building and exhibits.
3. Architecture detail merged per material through `merge.ts`.
4. Lighting: Lightformer environment on all tiers, physical spot pool that skips lights behind walls, N8AO, bloom, SMAA and vignette gated by tier.
5. Display furniture per tier inside the existing footprints; plaques as one atlas texture and one instanced mesh.
6. Furniture in the atrium and wings, clear of the navmesh walking lines.
7. Regenerate GLB models with PBR materials.

## Acceptance criteria

- [x] No surface in the shell uses a plain flat colour on `high` once textures load.
- [x] Draw calls stay under 400 in every e2e view on `high`.
- [x] `/visit` still reaches `ready` with no console errors on all three tiers.
- [x] Exhibit footprints and collision are unchanged (collision tests pass).
- [x] Metals render lit on `low`.

## Out of scope

Baking the Blender lightmap (decision 0005), navmesh regeneration, new exhibits or exhibit IDs, portal content.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

## Handoff

Screenshots of the atrium, one wing and one core vitrine.
