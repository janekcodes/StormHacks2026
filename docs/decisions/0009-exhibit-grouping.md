> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** A1, A2, A3, A4, A5, D6, D7, D8, D9
> **Status:** Final

# 0009 · Exhibit grouping audit and relocation

## Context

Plan 15 asked for a full audit of artifact placement with the goal of "better grouping", while keeping the BLUEPRINT section 2 organising principle intact: depth inside a wing is date, so the Foundations band (1936 to 1969) is always the band nearest the concourse. That is why the year mark "1936" is painted at every wing's front door; it is the band label, not a per-exhibit label, and it is by design.

This decision records what the audit found and the one relocation that was actually warranted.

## Audit method

Each exhibit's position was converted from plan `(x, z)` to wing coordinates `(radius, lateral)` where `radius` is the distance along the wing's radial axis (depth from the atrium centre) and `lateral` is the perpendicular offset across the wing. A wing is "well grouped" when, inside a band, exhibits sit at one or two consistent radii, are date-ordered across the lateral axis, and are evenly spaced.

## Findings

| Wing | Band | Finding |
| --- | --- | --- |
| A | inner | 5 exhibits split 3 + 2 at radii 19.25 / 25.18. Clean, but the two radii sit deeper than the matching inner rows in B (18.40 / 23.16) and C (18.45 / 23.28), so the era bridge between A and B feels offset. |
| B | inner/middle/outer | 3 + 3 + 3 rows at consistent radii (18.40 / 23.16 / 32.00 / 43.33), symmetric lateral spread. No change. |
| C | inner/middle/outer | Clean rows; outer band has 2 exhibits (C9, C10) both on one lateral side, a minor non-blocking asymmetry at the far corner. |
| D | middle | The one real defect: 8 exhibits (D2 to D9) in two rows, but the second row (D6 to D9) is laterally lopsided, centred about +3.1 m instead of under the first row. |
| D | inner/outer | inner has 1 exhibit, outer 2. Band population, out of scope. |
| E, F, P, G, S, X | all | Already clean: consistent radii per band, symmetric and date-ordered. |

The band-population imbalance (A inner 5 vs A outer 1; B inner 6) noted during planning is a registry property, not a spacing defect. Moving exhibits between bands would change their `band` field, which is out of scope for plan 15, so those imbalances are left as authored.

## Decision

1. **Wing A inner band (A1 to A5).** Re-point the two rows at B and C's inner radii so the era bridge between A and B crosses at matching depth: row one 19.25 to 18.40, row two 25.18 to 23.16. Lateral offsets and date order are unchanged.
2. **Wing D middle band, second row (D6 to D9).** Re-centre the second row under the first: lateral offsets -2.66 / 1.17 / 5.01 / 8.85 become -5.76 / -1.92 / 1.92 / 5.76, keeping 3.84 m spacing and staying 2.13 m off the south wall. D2 to D5 are unchanged.
3. **Everything else stays.** B, C, E, F and the galleries already follow clean era-band grouping.

## Consequences

- `packages/content/data/exhibits.json` positions change for A1 to A5 and D6 to D9. Their `face` vectors are recomputed to point at the atrium centre.
- `navmesh.bin` is geometry-only (walls and glass), so it is unchanged. `standpoints.json` is regenerated because viewing points derive from exhibit positions.
- The placement tests in `tools/plan/test/placement.test.ts` (inside room, at least 0.5 m from walls, at least 2.4 m apart) continue to pass and now guard the relocated positions.
- `docs/exhibits` files for built exhibits A1 and the D6/D7 portals are unaffected; their captions and stats do not change.
