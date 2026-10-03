> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Ready
> **Depends on:** 03

# 05 · 3D scene shell

## Goal

A walkable, empty museum in React Three Fiber at `/visit`: floors, walls, ceiling, atrium, exterior glass, lighting, first-person controls and collision. Visually at least as good as the prototype, within the BLUEPRINT performance budget.

## Read first

- BLUEPRINT §5 (3D scale), §9 Tech (what the prototype did), §10 (stack, budget)
- `seed/prototype/MuseumBuilding.dc.html`: functions `init()` (scene, materials, walls, merge step, lights) and `frame()` (movement, collision)

## Deliverables

```
packages/scene/src/
  Museum.tsx               <Canvas> root, quality tier, suspense
  building/Floors.tsx      outline + per-room floors (tinted), era dashes, year marks
  building/Walls.tsx       merged static geometry from building.json
  building/Atrium.tsx      glass, skylight, planters, kiosk, benches
  building/Signage.tsx     wing signs, foyer welcome sign
  lighting/Lighting.tsx    environment, hemisphere, shadowed directional following player
  player/usePlayer.ts      Zustand store: position, yaw, pitch, quality
  player/Controls.tsx      keyboard + drag look + touch buttons
  player/collision.ts      circle vs wall segments, circle vs obstacles
  quality.ts               detect-gpu → 'high' | 'balanced' | 'low'
apps/web/app/visit/page.tsx  client-only dynamic import of <Museum/>
```

## Steps

1. Load geometry from `@museum/content/generated/building.json`. No coordinates in scene code.
2. **Walls:** build all wall boxes, then merge per material into a few meshes (`BufferGeometryUtils.mergeGeometries`). Exterior walls: solid 0 to 0.9 m and 4.2 to 5 m, glass between, mullions every ~3 m, as in the prototype. Lintels above every door, 3.4 to 5 m.
3. **Floors:** one textured base floor from the outline, one tinted floor per room (tint × base colour). Era dashes as one `InstancedMesh`. Year marks as text decals facing outward.
4. **Ceiling** at 5 m with the atrium cut out; atrium skylight at 7.5 m; upper atrium glass between.
5. **Lighting baseline:** ACES tone mapping, sRGB output, PMREM room environment, hemisphere light, one directional light with soft shadows following the player (shadow frustum ±16 m). Exposure ~0.8. This is a placeholder for baked lightmaps (plan 09).
6. **Controls:** W/S or ↑/↓ forward/back, A/D strafe, ←/→ or Q turn, Shift run (3.4 → 7 m/s), drag to look (pitch clamped ±1.1 rad), on-screen hold buttons for touch, M toggles minimap (uses `FloorMap compact` from 04). Keys bound to the canvas container, not `window`.
7. **Collision:** player radius 0.35 m against wall, glass and lintel-free door segments (min distance 0.48 m to segment), plus circular obstacles (planters, kiosk, desk). Axis-separated sliding.
8. Start in the foyer at (0, 34.5) facing north (yaw 0).
9. **Quality tiers:** `high` (dpr ≤ 2, 2048 shadows), `balanced` (dpr ≤ 1.25, 1024), `low` (dpr 1, no shadows, no environment map).
10. Zone HUD: current room name from point-in-polygon on `rooms`.

## Acceptance criteria

- [ ] Walk from the foyer through the atrium into every wing without clipping through walls or getting stuck in doors.
- [ ] Draw calls under 150 in any view with no exhibits loaded (`renderer.info`).
- [ ] 60 fps on `balanced` on a mid-range laptop (record device and numbers in the PR).
- [ ] Playwright (headless WebGL) loads `/visit`, reaches "ready", screenshots foyer and atrium with no console errors.
- [ ] Zone HUD shows the correct room in all 13 rooms (unit-test the point-in-polygon with one point per room).
- [ ] No `window` keydown listeners.

## Out of scope

Exhibits, portals, navmesh, audio, guide.

## Verify

```bash
pnpm --filter @museum/scene test
pnpm --filter web test:e2e -- visit.spec.ts
```

## Handoff

PR includes side-by-side screenshots: prototype vs new, same four viewpoints (foyer, atrium, Wing B inner band, Wing F outer band).
