> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** all (placeholders)
> **Status:** Final
> **Depends on:** 06

# 07 · Exhibit runtime and portal overlay

## Goal

All 77 exhibits stand in the building as placeholders with plaques, can be hovered, focused and clicked, and open a portal overlay that lazy-loads the exhibit's portal package (or a "planned" card). After this plan, adding an exhibit is data plus a package, never scene code.

## Read first

- BLUEPRINT §7 (contract), §8 rule 3 (planned exhibits), §9 Tech
- Prototype: the "place all exhibits" block, `pickAt`, focus logic in `frame()`, spotlight pool, portal overlay markup

## Deliverables

```
packages/scene/src/exhibits/Exhibits.tsx      places every exhibit from content
packages/scene/src/exhibits/Placeholder.tsx   core (vitrine) / extended (plinth) / open (floor ring)
packages/scene/src/exhibits/Plaque.tsx        text texture from content
packages/scene/src/exhibits/useFocus.ts       focus (in front, < 4.6 m, cos > 0.82) and hover raycast
packages/scene/src/exhibits/SpotPool.tsx      6 spotlights reassigned to nearest exhibits
packages/scene/src/portal/PortalOverlay.tsx   overlay, Esc/close, prev/next within zone
packages/scene/src/portal/registry.ts         id → () => import('@museum/portal-<id>')
apps/web/app/visit/page.tsx                   ?exhibit=ID deep link opens that portal
```

## Steps

1. Each exhibit is a group at `position`, rotated so local +z points along `face`. Built exhibits render a model slot (filled in 09; use a neutral box sized from a `footprint` field until then).
2. Placeholder visuals match the prototype: core = white plinth 1.0 m + glass vitrine + slowly rotating zone-ink object; extended = 0.85 m grey plinth + small object; open = floor ring + stand.
3. Plaque: ID, year, title, and either "Click to open portal" (built) or "Core/Extended · portal in development".
4. Interaction: hover highlight (spot intensity up, cursor pointer), click → `walkTo(id)` then open portal on arrival; E key opens the focused exhibit. Hover requires a clear line of sight (no wall between).
5. Distance culling: exhibit groups beyond 40 m are hidden; animations run only within 18 m.
6. Overlay: chip (tier), `ID · year · zone`, title, caption, the portal component (`React.lazy`) or planned card, 3 stats, Prev/Next within the zone, Esc closes and returns focus to the canvas. Scene rendering pauses while the overlay is open.
7. Passport: opened IDs in the Zustand store, persisted to `localStorage` (try/catch), shown as "N of 76".
8. Deep link `/visit?exhibit=B2` walks there and opens it. `/exhibit/[id]` gets an "Open in museum" link to it.

## Acceptance criteria

- [x] 77 exhibits render at their content positions; count verified in a test.
- [x] Clicking any exhibit walks there via the navmesh and opens the overlay.
- [x] Unbuilt exhibits show the planned card, never fake portal content.
- [x] Portal packages are separate chunks (verify in the build output) and only load when opened.
- [x] Esc and the close button return keyboard focus to the canvas.
- [x] Draw calls under 400 in the busiest view on `high`.

## Out of scope

Real portal code (08), real models (09), narration (10).

## Verify

```bash
pnpm --filter @museum/scene test
pnpm --filter web test:e2e -- exhibits.spec.ts
```

## Handoff

List any exhibit whose stand point or placeholder overlaps geometry, with a screenshot.
