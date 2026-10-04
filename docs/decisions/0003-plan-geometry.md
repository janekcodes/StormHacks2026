> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 0003 · Plan geometry: clipper choice, authored exhibits, room colours

## Context

Plan 03 turns the authored `packages/content/data/plan.json` into all building geometry (`walls`, `lintels`, `glass`, `rooms`, `dashes`, `marks`, `signs`). Two of those steps need polygon boolean operations: room polygons are sector wedges clipped against the building outline, and the Foyer is the south sector with the People and Shop alcoves subtracted. The prototype computed this geometry inside a canvas document; there is no source algorithm to copy, only the baked golden output in `seed/plan.reference.json`. Three decisions needed a record before the generator could be built.

## Decision

- **Clipper: `polygon-clipping@0.15.7`.** It is the Martinez-Rueda boolean library and handles the non-convex outline correctly where Sutherland-Hodgman does not. Its inputs must be a `Polygon` or `MultiPolygon`, so a bare ring is always wrapped as `[ring]`. Its ESM default export carries `union`, `intersection`, `xor`, `difference`.
    10|
- **Exhibit positions are authored, not derived.** The prototype derived exhibit positions from the room polygons, which means adding one exhibit could shift its neighbours. That coupling is deliberately dropped. Positions live in `packages/content/data/exhibits.json` (written by plan 02) and are never recomputed by `@museum/plan`. Plan 03 only verifies them: inside their zone's room polygon, at least 0.5 m from every wall, and at least 2.4 m apart.

- **Room colours follow BLUEPRINT section 4, not the reference palette.** The golden file uses the prototype's colours; BLUEPRINT section 4 is the source of truth. Two rooms therefore differ from the golden data on purpose: `Atr` uses zone P's `#efe9dc` / `#7a6a48` (not `#e9eef0` / `#2f6c80`), and `X` uses `#eceef0` / `#4f5963` (not `#f1efe9` / `#4f5963`). `Foyer`, `Shop` and `Conc` have no BLUEPRINT colours and stay authored. Golden tests compare geometry only, so they are unaffected.

## Consequences

- `@museum/plan` depends on `polygon-clipping`; no other boolean library is used in the monorepo.
- Exhibit placement is validated by a test, not by a data fix; the authored positions already pass (closest pair `E1`/`E2` at 2.445 m).
- The golden test must never assert room or zone colours, only geometry, so the BLUEPRINT-colour departure does not fail CI.
