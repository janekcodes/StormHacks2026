> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** all (as markers and pages)
> **Status:** Ready
> **Depends on:** 03

# 04 · 2D floor plan and exhibit pages

## Goal

The no-WebGL path through the museum (BLUEPRINT §10 "Accessibility"): an interactive 2D floor plan at `/map`, a page per exhibit at `/exhibit/[id]`, and an index at `/exhibits`. The same map component is reused later as the in-scene minimap.

## Read first

- BLUEPRINT §4, §5, §6, §10 Accessibility
- `packages/content/generated/building.json`, `plan.svg`

## Deliverables

```
packages/scene/src/map/FloorMap.tsx      SVG map from building.json + exhibits
apps/web/app/map/page.tsx
apps/web/app/exhibits/page.tsx           list grouped by zone and band
apps/web/app/exhibit/[id]/page.tsx       statically generated for all 77 IDs
apps/web/e2e/map.spec.ts
```

## Steps

1. `FloorMap` renders rooms (tint), walls, atrium glass and exhibit markers from data, never from hardcoded coordinates. Marker style by tier: built = filled ink, core = 3 px ink ring, extended = dashed ring, open = grey dashed.
2. Props: `highlight?: ExhibitId[]`, `player?: { x, z, yaw }`, `onSelect?(id)`, `compact?: boolean` (minimap mode: no labels).
3. Markers are real `<a href="/exhibit/ID">` elements with `aria-label` "B2, 1945, ENIAC, Built". Keyboard focus visible.
4. `/exhibit/[id]`: title, year, zone, band, tier, caption (or "Planned exhibit" note for non-built), stats, sources, caveat, a small map with this exhibit highlighted, prev/next within the zone. Use `generateStaticParams` over all 77 IDs.
5. Unbuilt exhibits say clearly that the exhibit is planned (BLUEPRINT §11 rule 3 applies to all copy).
6. Page metadata (title, description) per exhibit.

## Acceptance criteria

- [x] `/map` renders all 77 markers; clicking any marker navigates to its page.
- [x] All 77 exhibit pages build statically and return 200.
- [x] Map is usable by keyboard alone (Tab through markers in zone order).
- [x] axe (via Playwright) reports no serious violations on `/map` and `/exhibit/B2`.
- [x] No WebGL code is loaded on these routes (check the route bundle).

## Out of scope

The 3D scene, portals (pages link to "Open in museum" which can 404 until 07), narration audio.

## Verify

```bash
pnpm --filter web build
pnpm --filter web test:e2e -- map.spec.ts
```

## Handoff

Screenshot of `/map` next to the prototype `FloorPlan` artboard.
