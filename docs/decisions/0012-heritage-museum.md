> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 0012 · Heritage museum art direction, PBR textures, interim AO and web fonts

## Context

The audit for plans 17 and 18 found that the 3D shell is entirely flat-colour primitives with no ambient occlusion (the baked lightmap from decision 0005 has never been produced), generic box plinths, a near-black ceiling and self-emissive artifact models. The 2D shell has no design tokens, loads fonts with render-blocking `@import` and uses IBM Plex Sans as its body font, which contradicts BLUEPRINT section 9 (IBM Plex Mono). The product owner chose a classic heritage museum direction (Smithsonian or British Museum rather than a white-cube gallery) and CC0 texture sourcing.

## Decision

- **Art direction: heritage museum.** Warm limestone and marble floors, oak parquet in the wing galleries, plaster upper walls over a dark walnut wainscot with chair rail, deep skirting and crown cornice, architraves on every doorway, a coffered ceiling with recessed downlights, brass-framed glass vitrines on walnut plinths with marble tops, brass stanchions and velvet rope, brass reading-rail plaques and moody, focused spot lighting. This supersedes the surface palette in decision 0010. The 0010 rule that zone `ink` is the 3D wayfinding colour stays, and adds a painted zone frieze band on wing walls.
- **Textures are CC0 from Poly Haven**, recorded per file in `apps/web/public/textures/CREDITS.md`. Each set is packed into three maps (albedo, normal, ORM with occlusion in R, roughness in G and metalness in B) at 1024 px and 512 px.
- **Texture format is WebP, not KTX2, for now.** BLUEPRINT section 10 names KTX2. No KTX2 encoder (`toktx` or `basisu`) is available on the development machines, while `sharp` is already in the workspace. WebP keeps the download small (well under the 3 MB initial-load budget, and textures stream in after the first frame, so they are not part of the initial load at all). GPU memory is bounded by tier: 1024 px on `high`, 512 px on `balanced`, flat colour on `low`. Converting the same packed maps to KTX2 later is a drop-in change in `packages/scene/src/building/textures.ts`.
- **Interim ambient occlusion is screen-space N8AO** via `@react-three/postprocessing`, on `high` (full resolution) and `balanced` (half resolution), off on `low`. It stays until the Blender bake from decision 0005 exists; when it does, N8AO intensity drops and the lightmap takes over.
- **Image-based lighting comes from a drei `<Environment>` built from `Lightformer`s** (no HDRI download). It is enabled on every tier, including `low`, so metals never render black.
- **Web fonts load through `next/font/google`**: Chakra Petch 600/700 (display), IBM Plex Mono 400/500/600 (body and data, as BLUEPRINT section 9 already specifies) and VT323 (portal screens). Plex Sans is removed. They are exposed as CSS variables `--font-display`, `--font-body` and `--font-screen` and used by both `apps/web` and the scene HUD.

## Consequences

- New runtime dependency `@react-three/postprocessing` in `@museum/scene`. New dev dependency `sharp` in `@museum/assets` for `pnpm --filter @museum/assets textures`.
- `apps/web/public/textures/` holds about 36 WebP files; the 512 px set alone is under 1 MB.
- Artifact GLBs are regenerated without self-emission and with PBR kit materials.
- BLUEPRINT section 9 visual tokens are unchanged; this record adds the 3D material palette alongside them.
- Exhibit click and hover sightlines (`lineClear` in `packages/scene/src/exhibits/focus.ts`) now use a 0.16 m ray clearance instead of the 0.48 m walking clearance, so an exhibit seen through a doorway (G2 from the foyer) can be opened.

## Known issue (out of scope for plan 17)

Plan 17 verification found that 10 standpoints in `packages/content/generated/standpoints.json` (from the decision 0011 compaction) sit on the far side of a wall from their exhibit: A1, A3, B1, B3, C1, C3, E1, E3, G1 and G3. Walking to them leaves the visitor facing a wall. Regenerating standpoints is navmesh work, which plan 17 lists as out of scope, so this is left for a follow-up plan in `tools/plan`.
