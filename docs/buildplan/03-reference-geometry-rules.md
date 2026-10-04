> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 03 · Rules behind `seed/plan.reference.json`

## Why this file exists

`seed/plan.reference.json` is the golden output for plan 03, but it is a **baked literal**. The prototype computed it inside a canvas document and pasted the result into `seed/prototype/MuseumBuilding.dc.html` as `this.GEO = {...}`; the generating code is not in the repo. Plan 03 therefore asks for an output nobody can read an algorithm out of.

These are the rules recovered by measuring the reference back against BLUEPRINT section 5. Every claim below was checked numerically against the reference, and the worst error for each family is quoted. Treat it as an appendix to [03-plan-geometry.md](03-plan-geometry.md), not as a replacement for it: the plan's own Deliverables, Acceptance criteria and Out of scope still govern.

All angles are **screen degrees** (y down, so +z is south and 270 degrees is north). `rc = 16.24 m`, `ra = 10.5 m`.

## The one constant the plan does not name

```
innerEdge = rc * cos(22.5 deg) = 15.00376 m
```

This is the perpendicular distance from the centre to a concourse **side**, as opposed to a vertex. It is the inner edge of every wing, the start of every era band, and the line the two alcove walls rise from. The plan's `bands` row calls it "inner edge distance `concourseR · cos 22.5°`"; it is needed in four more places than that row implies.

## Octagons

Atrium and concourse both have vertices at `22.5 + 45k` degrees, `k = 0..7`. So **side `k` runs from vertex `k` to vertex `k+1`, and its midpoint faces `45 + 45k`**. That midpoint angle is what identifies a side:

- The concourse side that is fully open (no wall, no lintel, no sign) is the one whose midpoint faces **90 degrees** (south, onto the foyer). It is side `k = 1`.
- Atrium glass gaps go on the sides whose midpoints face 0, 90, 180 and 270 degrees, which is `k = 7, 1, 3, 5`. The other four sides are one unbroken run.

Useful identity: **a sector's centre angle equals the midpoint angle of the concourse side it opens off.** That is what makes the next rule work.

## Rooms: a wedge and a single half-plane

Inside one 45 degree sector the concourse boundary is a single flat side, perpendicular to the sector's centre direction. So subtracting the concourse from a wing needs no octagon subtraction at all:

```
room = building  ∩  wedge(centre - 22.5, centre + 22.5)  ∩  { p · dir(centre) >= innerEdge }
```

Hand the wedge and the half-plane to the clipper as oversized polygons (400 m reach worked). Do **not** clip the building by hand: the outline is not convex, and Sutherland-Hodgman on the entrance bulge gives the wrong answer.

The three irregular cases:

| Room | Extra clips |
| --- | --- |
| `Sx` (Society) | the SE sector, plus the half-plane on the 22.5-to-45 side of the 45 degree split |
| `X` (Future Lab) | the SE sector, plus the other side of that split |
| `G`, `Shop` | the S sector, plus `x <= -4.55` / `x >= +4.55`, **plus `z <= 28`** |
| `Foyer` | the S sector **minus** `G` **minus** `Shop` (a real difference; the result is not convex) |

The `z <= 28` cap on the two alcoves is the plan's "alcoves capped at `y <= 1040`". Without it the foyer loses the entrance bulge to its neighbours.

`Conc` is the solid concourse octagon and `Atr` the solid atrium octagon, not rings. The atrium is drawn over the concourse.

### Comparing room polygons

The reference carries redundant vertices that a clipper will not reproduce, and vice versa: `C`, `E`, `G` and `Shop` each have one repeated or collinear point that comes from an outline vertex sitting exactly on a cut line. Compare polygons **after** dropping repeated and collinear vertices and rotating to a canonical start, or the test fails on geometry that is actually identical. Areas then agree to 1e-5 square metres.

## Exterior walls and the entrance

The outline is 39 points once the bulge is expanded: 9 authored, 25 bulge, 5 authored. The bulge is emitted `i = 24` down to `0`, so its points run east to west and **its first point repeats the authored `[1160, 1040]`**, as its last repeats `[840, 1040]`. Those repeats are in the plan's authored `outline` row and must be kept: the room polygons reference them. They produce two zero-length exterior walls, which consumers skip.

Walls are one per outline edge, walking the ring from its last vertex. With `jambA = bulgeStart + 10` and `jambB = bulgeStart + 14`:

```
for i in 0 .. 38:
    if i > jambA and i <= jambB: continue      # the opening itself
    emit wall(outline[i-1 mod 39], outline[i])
```

That is **35 exterior walls**, of which 2 are zero-length. The guard must be on `i` alone; testing the *previous* index as well wrongly drops the wrap-around edge `38 -> 0` and leaves 34.

`entrance = [outline[jambA], outline[jambB]]`, which is `[[1.867, 38.142], [-1.867, 38.142]]`, 3.733 m apart.

The reference has a **third** zero-length wall, closing the ring back onto its own last vertex (`[-49, 32.2] -> [-49, 32.2]`). That is a loop artefact in the prototype. Reproducing it gives exactly 85 walls; skipping it gives 84, which is still inside the plan's `85 ± 2`. Skipping it is cleaner, and 84 is what a correct generator produces.

## Interior walls: 49 of them

| Family | Count | Rule |
| --- | --- | --- |
| Concourse sides | 14 | 7 sides (side `k = 1` is open) x 2 runs, one 64 px gap at `t = 0.5` |
| Radial wing walls | 28 | 8 rays, see below |
| SE split wall | 3 | 2 gaps at `t = 0.3, 0.8`, 34 px |
| Alcove walls | 4 | 2 walls x 2 runs, one 40 px gap at `t = 0.55` |

**Radial walls** go from the concourse **vertex** at `22.5 + 45k` straight out along that same angle to the first crossing with the outline. Doors are three 34 px gaps at `t = 0.22, 0.52, 0.82`, except the two walls at **67.5 and 112.5 degrees**, which get a single gap at `t = 0.78` and so yield 2 runs rather than 4. `4+2+2+4+4+4+4+4 = 28`.

**Alcove walls** run from `[x, innerEdge]` to `[x, 28]` at `x = -4.55` and `x = +4.55`.

**The SE split wall starts at radius `rc`, not at the octagon edge.** Its first point is `rc * dir(45) = [11.483, 11.483]`, which is 0.87 m *inside* the concourse, since the octagon boundary at 45 degrees is only 15.004 m out. The room polygons meanwhile meet at `[10.609, 10.609]`, the side midpoint. This is a prototype quirk, but moving the wall start to the octagon edge shifts a vertex by 0.874 m and breaks the 0.05 m golden tolerance. Author it explicitly, for example `seSplit.startRadius: 232`.

### Door cutting

For a wall `a -> b` of length `L`, a gap of width `w` centred at fraction `t`:

```
run 1     a                     ->  a + u * (t*L - w/2)
lintel    a + u * (t*L - w/2)   ->  a + u * (t*L + w/2)
run 2     a + u * (t*L + w/2)   ->  b
```

Lintel endpoints are ordered from the `a` end. One lintel per gap gives **31**: 7 concourse + 20 radial + 2 SE split + 2 alcove.

Emission order in the reference, if you want a position-for-position match: concourse sides `k = 0, 2, 3, 4, 5, 6, 7`; then radials at 22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5; then the SE split; then the west alcove, then the east. Comparing as an unordered bag of segments (either endpoint order) is simpler and just as strict.

## Era bands

Per room, with `u = dir(centre of the room's angular span)` and `v = perp(u)`:

```
outer  = max over room vertices of (vertex · u)
depth  = outer - innerEdge
band i starts at innerEdge + depth * i / 3
```

Seven rooms get bands, in this order: **A, B, C, D, E, F, Sx**. Note what the band direction is:

- `A..F` use the sector centre (135, 180, 225, 315, 270, 0).
- **`Sx` uses 33.75 degrees**, the centre of its own 22.5-to-45 span, not the 45 degree sector centre.
- `X` gets no bands, no lines and no marks, despite being a sector half.

### Era lines (`dashes`, 14 of them)

One per band join, so `i = 1` and `i = 2`. Take the line `p · u = edge`, clip it to the room polygon, then **pull each end back by `0.56 m / sin(angle between the clipping edge and the line)`**.

`0.56 m` is 8 plan px. The `1 / sin` factor is why the pull-back is 0.606 m against a radial wall (which meets the line at 67.5 degrees), 0.792 m against a wall that meets it at 45 degrees, and 0.571 m in `Sx` (where the bounding walls are only 11.25 degrees off `u`). Equivalently: clip against the room inset by 0.56 m. Reproduces all 14 lines to **0.001 m**.

```
for each crossing of edge (a -> b) with the line:
    e    = (b - a) / |b - a|
    sin  = |e · u|                     # angle between the edge and the line
    pull = 0.56 / sin
lo = lowest crossing along v  + its pull
hi = highest crossing along v - its pull
```

### Year marks (21 of them)

Labels are `1936`, `1970`, `2000`, which are the BLUEPRINT section 2 band start years. Each sits past its band's inner edge by a fixed offset, **and takes its lateral position from the band line's midpoint, not from the sector axis**:

| Band | Distance along `u` | Lateral position along `v` |
| --- | --- | --- |
| inner (`1936`) | `innerEdge + 2.1 m` (30 px) | midpoint of the crossing at the label's own distance |
| middle (`1970`) | `dash 1 distance + 1.12 m` (16 px) | **midpoint of era line 1** |
| outer (`2000`) | `dash 2 distance + 1.12 m` | **midpoint of era line 2** |

Inheriting the line's midpoint is what keeps the outer labels inside wings that a front block cuts short; placing them on the sector axis instead puts the `2000` marks in `A`, `C` and `D` up to **5.9 m** off.

The inner band has no line of its own, since its inner edge *is* the concourse wall, so centre that label where it falls. Two notes:

- Do not probe the crossing exactly at `innerEdge`. Room vertices are rounded to millimetres (15.004 vs 15.00376), so the line misses the polygon and the clip comes back empty.
- This rule reproduces **20 of 21** marks exactly. The `1936` label in `Sx` lands 1.02 m from where the prototype put it, because `Sx` is the one room whose inner edge is not perpendicular to its band direction. No rule tried matched it without special-casing; floor text at this scale is not worth one. Hold marks to a loose tolerance and the other families to 0.05 m.

## Wing signs (7 of them)

One per concourse side that has a wall, so the open south side gets none:

```
p = (innerEdge - 0.42 m) * dir(side midpoint)       # 0.42 m is 6 px
u = dir(side midpoint)
k = the room that side opens into
```

The SE side's sign points at `Sx`, the larger half. Matches the reference to **0.00000 m**.

## Verified result

A generator built to these rules produces, against the reference:

| Family | Count | Worst error |
| --- | --- | --- |
| walls (non-degenerate) | 82 vs 82 | 0.00000 m |
| lintels | 31 vs 31 | 0.00000 m |
| glass | 12 vs 12 | 0.00000 m |
| signs | 7 vs 7 | 0.00000 m |
| era lines | 14 vs 14 | 0.00100 m |
| rooms | 13 vs 13 | areas equal to 1e-5 square metres |
| year marks | 21 vs 21 | 0.00000 m, except `Sx` `1936` at 1.015 m |
| `ra` / `rc` | 10.5 / 16.24 | exact |

## Two things worth knowing before you start

**The authored exhibit positions already pass.** All 77 positions in `packages/content/data/exhibits.json` sit inside their zone's room polygon, none is closer than 0.5 m to a wall, and the closest pair (`E1`, `E2`) is 2.445 m apart. Acceptance criteria 5 and 6 need a test, not a data fix. Map zone to room with `P -> Atr`, `S -> Sx`, everything else to its own letter.

**`polygon-clipping@0.15.7` installs and works.** Its inputs must be a **polygon or multipolygon**, not a bare ring: pass `[ring]`, not `ring`, or it throws `Input geometry is not a valid Polygon or MultiPolygon`. The ESM default export carries `union`, `intersection`, `xor`, `difference`.

## Where BLUEPRINT overrules the reference

Room colours. The reference uses the prototype's palette; BLUEPRINT section 4 is the source of truth, so these two rooms should differ from the golden data:

| Room | Reference tint / ink | BLUEPRINT section 4 |
| --- | --- | --- |
| `Atr` | `#e9eef0` / `#2f6c80` | zone P: `#efe9dc` / `#7a6a48` |
| `X` | `#f1efe9` / `#4f5963` | G, S, X together: `#eceef0` / `#4f5963` |

BLUEPRINT does not give colours to `Foyer`, `Shop` or `Conc`, so those stay authored. Pulling the rest from `ZONES` in `@museum/content` keeps one source of truth. Worth recording in the plan 03 decision file, since it is a deliberate departure from the golden data; the golden tests compare geometry, not colour, so they still hold.
