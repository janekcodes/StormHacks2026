> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final
> **Depends on:** 05

# 06 · Navmesh and travel

## Goal

Real pathfinding so clicking anything (an exhibit, the minimap, a room button, a guide tool call) walks the visitor there through doorways. This replaces the prototype's fade-teleport and is the movement API the guide uses in 11.

## Read first

- BLUEPRINT §10 (Movement row), §11 (`walkTo`, `startTour` tools)
- Prototype `travelTo`, `goExhibit`, `jumpTargets`, `standPoint`

## Deliverables

```
tools/plan/src/navmesh.ts           build navmesh at build time from building.json floor + walls
packages/content/generated/navmesh.bin
packages/scene/src/nav/useNav.ts    load navmesh, query paths
packages/scene/src/nav/travel.ts    travelTo(target, { face?, onArrive? }) using the player store
packages/scene/src/nav/targets.ts   room entry points and exhibit stand points
```

## Steps

1. Use `recast-navigation` (`@recast-navigation/core` + `@recast-navigation/three`). Verify its current API against its docs before writing code. Agent radius 0.35 m, height 1.7 m, max climb 0.
2. Generate the navmesh in `tools/plan` from a walkable floor (outline minus wall footprints and fixed obstacles) and commit it as a generated artifact with a staleness check, same as 03.
3. `travelTo` follows the path at 8 m/s with eased turning; yaw blends to the final facing over the last 1.5 m. Any movement key cancels travel.
4. **Stand points:** for each exhibit, the nearest navmesh point 1.6 to 2.8 m in front of it along `face`, precomputed at build time and stored in `generated/standpoints.json`.
5. **Room targets:** one entry point per room (2 to 4 m inside the wing door, facing outward), also precomputed.
6. Minimap click → `travelTo` the nearest navmesh point. Room buttons → room targets.
7. Expose a small imperative API (`museum.walkTo(id)`, `museum.goRoom(key)`) on the scene for 07 and 11.

## Acceptance criteria

- [x] A path exists from the foyer start to every one of the 77 stand points and 13 room targets (unit test over all).
- [x] No path segment intersects a wall (test against `building.json` walls).
- [x] Clicking the minimap inside a wall or outside the building does nothing.
- [x] Travel to the farthest exhibit from the foyer completes in under 15 s.
- [x] The fade-teleport code path does not exist.

## Out of scope

Exhibit meshes, portal opening, guide.

## Verify

```bash
pnpm --filter @museum/plan test
pnpm --filter @museum/scene test -- nav
```

## Handoff

Document the navmesh settings in `docs/decisions/` so later layout changes regenerate it identically.
