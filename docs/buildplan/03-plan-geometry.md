> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none (positions come from 02)
> **Status:** Ready
> **Depends on:** 02

# 03 · Plan geometry generator

## Goal

`tools/plan` turns one authored file, `packages/content/data/plan.json`, into all building geometry the app needs: walls, door lintels, atrium glass, rooms, era lines, year marks, wing signs, and the 2D map. Output must match the prototype (`seed/plan.reference.json`) within tolerance.

## Read first

- BLUEPRINT §5 (footprint, plan geometry table, 3D scale)
- `seed/plan.reference.json` (golden output)
- `seed/prototype/MuseumBuilding.dc.html` (search `GEO` to see how the output is consumed)

## Deliverables

```
packages/content/data/plan.json      authored input (plan pixels)
packages/content/src/plan-schema.ts  Zod schema for plan.json and for the generated output
tools/plan/src/*.ts                  generator
tools/plan/test/*.test.ts            golden tests
packages/content/generated/building.json   generated, committed, metres
```

## Authored input: `plan.json` (plan pixels, origin noted)

Encode exactly these values (from the prototype):

| Key | Value |
|---|---|
| `origin` | `[1000, 640]` |
| `scale` | `0.07` metres per plan px |
| `atriumR` | `150` (octagon circumradius, vertices at 22.5° + 45°k) |
| `concourseR` | `232` |
| `outline` | `[[300,340],[440,200],[1560,200],[1700,340],[1700,1100],[1660,1140],[1240,1140],[1240,1040],[1160,1040], BULGE, [840,1040],[760,1040],[760,1140],[340,1140],[300,1100]]` |
| `bulge` | 25 points from x 1160 back to 840: `x = 840 + 320·i/24`, `y = 1040 + 150·sin(πi/24)`, i = 24 down to 0 |
| `entranceGap` | bulge points 10 to 14 (in reversed order) left open |
| `sectors` | angle centre → zone: `0:F, 45:SX, 90:S, 135:A, 180:B, 225:C, 270:E, 315:D` (screen angles, y down) |
| `seSplit` | SE sector split at 45°: 22.5..45 = Society (S), 45..67.5 = Future Lab (X) |
| `southSplit` | S sector: People `x < 935`, Shop `x > 1065`, Foyer between; alcoves capped at `y ≤ 1040` |
| `doors` | radial walls: gaps 34 px at `[0.22, 0.52, 0.82]` of length; walls at 67.5° and 112.5°: one gap at `0.78`; SE split wall: `[0.3, 0.8]`; concourse sides: one 64 px gap at `0.5`, south side fully open; alcove walls: one 40 px gap at `0.55` |
| `atriumGlassGaps` | 70 px gap at the middle of the N, S, E, W sides |
| `bands` | per room: inner edge distance `concourseR · cos 22.5°`; outer = max projection of room vertices on the sector direction; split in thirds |

## Steps

1. Pick a polygon library (`polygon-clipping` recommended) for intersection and difference. Record it in a decision file.
2. Build: building polygon, atrium and concourse octagons, sector wedges ∩ (building − concourse), the SE and S splits.
3. Emit, in **metres** (`x = (px − 1000)·0.07`, `z = (py − 640)·0.07`):
   - `walls[]` `[x1, z1, x2, z2, 'ext'|'int']` with door gaps removed
   - `lintels[]` for every door gap
   - `glass[]` for atrium sides with gaps
   - `rooms[]` `{ key, name, tint, ink, poly }` including `Conc` and `Atr`
   - `dashes[]` era lines at 1/3 and 2/3 depth; `marks[]` `{ p, u, t: '1936'|'1970'|'2000' }`
   - `signs[]` one per wing door on the concourse `{ p, u, k }`
   - `entrance` gap endpoints
4. Write `generated/building.json`, validated by the output schema.
5. Also emit `generated/plan.svg` (2D map, same geometry) for plan 04.
6. `pnpm --filter tools-plan build:plan` regenerates both; CI fails if the committed outputs are stale.

## Acceptance criteria

- [ ] Wall count 85 ± 2, lintels 31, glass segments 12, rooms 13 (11 named + `Conc` + `Atr`). Same as `seed/plan.reference.json`.
- [ ] Every vertex in `walls`, `rooms` and `entrance` within **0.05 m** of the reference (golden test).
- [ ] Building bounds: x ±49.0, z −30.8 to 38.5 (± 0.1).
- [ ] Entrance gap width 3.73 m ± 0.05.
- [ ] Every exhibit position from 02 lies inside its zone's room polygon and at least 0.5 m from any wall.
- [ ] Minimum distance between any two exhibits ≥ 2.4 m.

## Out of scope

Exhibit placement logic. **Positions are authored data in `exhibits.json`, not derived.** Adding an exhibit must never move others. (The prototype derived them; that is deliberately dropped. Record this in a decision.)

## Verify

```bash
pnpm --filter @museum/plan test
pnpm --filter @museum/plan build:plan && git diff --exit-code packages/content/generated
```

## Handoff

Attach `generated/plan.svg` as a PR screenshot next to the prototype floor plan for visual comparison.
