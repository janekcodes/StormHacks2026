> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final
> **Depends on:** 14, 17, decision 12

# 18 · Design system and UI

## Goal

Replace the ad hoc styling of the web shell and the scene HUD with one design system built on the BLUEPRINT §9 tokens, and close the accessibility gaps found in the plan 17/18 audit, without breaking any e2e contract.

## Read first

- BLUEPRINT §9 "Visual language", §10 "Accessibility", §0 rule 6 (no em or en dashes)
- Decision 0012 (fonts)
- `apps/web/e2e/*.spec.ts` (selectors that must survive)

## Deliverables

```
apps/web/app/globals.css               :root tokens + shared primitives (button, panel, chip, badge, keycap)
apps/web/app/layout.tsx                next/font (Chakra Petch, Plex Mono, VT323), metadata, viewport
apps/web/app/not-found.tsx, error.tsx, loading.tsx
apps/web/components/SiteHeader.tsx     skip link, aria-current; replaces SiteNav and the /visit header
apps/web/components/SiteFooter.tsx
apps/web/app/page.tsx, page.module.css landing redesign with live counts
apps/web/app/visit/page.tsx            full viewport
apps/web/app/map, exhibits, exhibit/[id] legend, filters, framed portal, clean meta
apps/web/components/GuideWidget.tsx    shared guide styles, accessible dialog
packages/scene/src/Museum.tsx          loading splash, HUD redesign, keyboard Navigate menu
packages/scene/src/guide/GuidePanel.tsx shared guide styles, accessible dialog
packages/scene/src/portal/PortalOverlay.tsx dialog semantics, focus trap, motion
packages/scene/src/nav/travel.ts       reduced-motion travel
```

## Steps

1. Tokens and fonts; remove `@import` and per-page font links.
2. Shared primitives in `globals.css`, consumed by the web pages and the scene UI.
3. Shell: header, footer, error routes, metadata.
4. Pages and HUD redesign.
5. Accessibility and motion pass.

## Acceptance criteria

- [ ] No hardcoded colours in page or HUD CSS outside the token block (zone inks come from data).
- [ ] All interactive HUD and guide controls are at least 44 px; no text below 12 px.
- [ ] Guide panels are dialogs with Escape, focus return and a live log; portal overlay traps focus.
- [ ] Reduced motion shortens camera travel and disables transitions.
- [ ] All e2e specs and axe checks pass with the existing selectors.

## Out of scope

Changing exhibit content, the guide protocol, narration, or 3D scene geometry.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

## Handoff

Screenshots of the landing page, `/visit` (loading, HUD, guide open, portal open), `/map` and `/exhibit/B2`.
