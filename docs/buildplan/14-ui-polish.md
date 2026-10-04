> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final
> **Depends on:** 05, 07, 11

# 14 · UI polish and audit

## Goal

Audit the whole app and apply targeted UI refinements: redesign the plain landing page into an interactive, descriptive entry; block visitors from walking through artifacts; consolidate the HUD room-jump buttons into a "Navigate" dropdown (keeping Guide separate) so no buttons overlap; and correct the entrance banner tagline.

## Read first

- BLUEPRINT §9 "Visual language", §0 rule 6 (no em or en dashes in UI copy)
- `apps/web/app/page.tsx` (current landing page) and `packages/scene/src/Museum.tsx` (HUD)

## Deliverables

```
docs/buildplan/14-ui-polish.md         this plan
docs/buildplan/00-INDEX.md             row 14 added
apps/web/app/page.tsx                  redesigned landing page (server component)
apps/web/app/page.module.css           landing page styles
packages/scene/src/player/collision.ts   buildExhibitSegments(exhibits)
packages/scene/src/player/collision.test.ts   unit tests for exhibit collision
packages/scene/src/player/Controls.tsx   include exhibit segments in movement collision
packages/scene/src/Museum.tsx          HUD restructure: Navigate dropdown + Guide button
packages/scene/src/building/Signage.tsx  corrected entrance banner tagline
```

## Steps

1. Landing page: hero (heading, tagline, description, three CTAs), a `FloorMap` preview, and cards for the 13 built exhibits.
2. Artifact collision: emit footprint edge segments per exhibit and include them in manual movement collision.
3. HUD restructure: move Guide and a new Navigate dropdown into a single left toolbar column that cannot overlap the zone HUD or minimap.
4. Banner tagline: "Hello Museum" on line 1, "A virtual museum showcasing major milestones in the history of Computer Science" on line 2.

## Acceptance criteria

- [ ] Landing page shows the heading, tagline, description, CTAs, a floor-plan preview and built-exhibit cards.
- [ ] `/visit` blocks the player from walking through any exhibit, while viewing standpoints stay reachable.
- [ ] The Guide button and Navigate dropdown do not overlap the zone HUD, minimap, or each other.
- [ ] The entrance banner reads the exact two-line tagline.
- [ ] New collision unit tests pass; existing smoke/visit/map/exhibits/guide/portals e2e tests still pass.

## Out of scope

Carving exhibit footprints into the generated navmesh so auto-travel paths also avoid artifacts (requires regenerating `navmesh.bin` / `standpoints.json` and updating golden tests). Guided standpoints already approach from in front of each exhibit.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm --filter @museum/scene test
pnpm test:e2e
```

## Handoff

Screenshots of the landing page and the /visit HUD with the Navigate dropdown open.
