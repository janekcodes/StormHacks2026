> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 0004 · Navmesh settings and travel

## Context

Plan 06 replaces the prototype's fade-teleport with Recast/Detour pathfinding so clicks, room buttons and (later) the guide's `walkTo` tool all walk through doorways. The navmesh is generated at build time from `building.json` and committed as `packages/content/generated/navmesh.bin`. Later layout changes must regenerate it identically.

## Decision

- **Library:** `recast-navigation` 0.43 (`@recast-navigation/core` + `@recast-navigation/three` + `@recast-navigation/generators`). Solo navmesh via `threeToSoloNavMesh`. Runtime load with `importNavMesh` / `exportNavMesh`.
- **Agent:** radius **0.35 m**, height **1.7 m**, max climb **0** (matches BLUEPRINT / plan 05 collision radius).
- **Recast voxels:** `cs = 0.12 m`, `ch = 0.2 m`, so
  - `walkableRadius = ceil(0.35 / 0.12) = 3`
  - `walkableHeight = ceil(1.7 / 0.2) = 9`
  - `walkableClimb = 0`
  - `walkableSlopeAngle = 45°`
- **Input geometry:** walkable floor from the building outline (`THREE.ShapeGeometry`, Z corrected so plan +Z stays +Z), plus vertical wall/glass quads (no tops) and open cylinders for the fixed obstacles from plan 05 collision. Door gaps already present in `building.walls` stay open.
- **Travel:** `travelTo` follows Detour straight paths at **8 m/s**; yaw eases toward the segment heading and blends to the final facing over the last **1.5 m**. Any movement key cancels travel. No fade-teleport.
- **Targets:** `standpoints.json` stores one stand point per exhibit (1.6–2.8 m along `face`) and one entry point per room (13 rooms).
- **Serving:** CLI also copies `navmesh.bin` to `apps/web/public/navmesh.bin` for the client fetch.

## Consequences

- Run `pnpm --filter @museum/plan build:plan` after any plan geometry or exhibit position change; CI fails if `navmesh.bin` / `standpoints.json` are stale.
- Guide tools in plan 11 call `museum.walkTo` / `museum.goRoom` (also on `window.museum` while `/visit` is mounted).
- Changing agent radius or cell size requires regenerating the binary and updating this decision.
