> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** all (registry)
> **Status:** Ready
> **Depends on:** 01

# 02 · Content package

## Goal

`@museum/content` becomes the machine-readable mirror of BLUEPRINT §4, §6 and §7: typed, validated, and checked against the BLUEPRINT in CI so the two can never drift.

## Read first

- BLUEPRINT §3 (tiers), §4 (zones, colours), §6 (registry), §7 (exhibit contract), §8 (content rules), §12 (narration fields)
- `seed/exhibits.seed.json`

## Deliverables

```
packages/content/
  src/schema.ts          Zod schemas + inferred types
  src/zones.ts           zone metadata (code, name, location, ink, tint)
  src/index.ts           typed accessors: getExhibit(id), exhibitsByZone(z), isExhibitId(id)
  data/exhibits.json     77 entries (generated from seed, then hand-maintained)
  data/zones.json
  scripts/check-blueprint.ts
  test/*.test.ts
```

## Steps

1. **Schema.** `ExhibitId` is a Zod enum of the 77 IDs (generated from the data, exported as a TS union). `Exhibit` has:
   - registry: `id, year, title, zone, band (prologue|inner|middle|outer|null), tier (built|core|extended|open)`
   - placement: `position { x, z, face [fx, fz] }` in metres
   - content (optional until Built): `caption, hook, stats[3] {k, v, sourceId}, sources[] {id, label, url}, caveat?, narration?`
   - audio (optional, filled by 10): `{ src, align, voiceId, modelId, hash }`
   - portal (optional): `{ package: string }`
2. **Tier rules as refinements.** If `tier === 'built'`: `caption`, exactly 3 `stats`, at least one `source`, `portal` are required, and every `stat.sourceId` resolves. If the title or caption contains "first", `caveat` is required.
3. **Seed import.** One-off script turns `seed/exhibits.seed.json` into `data/exhibits.json`. Copy captions and stats for the 12 built exhibits from `seed/prototype/MuseumBuilding.dc.html` (`built()` method). Their sources are `[TBD]` for now: the schema must allow `TBD` markers **only** behind a `allowTbd` flag that CI turns off in plan 13. Record this in `docs/decisions/0002-tbd-sources.md`.
4. **BLUEPRINT check.** `scripts/check-blueprint.ts` parses the §6 markdown table in `BLUEPRINT.md` and compares ID, year, title, zone, band and tier with `data/exhibits.json`. Any difference fails with a readable diff. Wire it into `pnpm turbo run test`.
5. **Accessors and types** exported from `src/index.ts`. No runtime dependency other than Zod.

## Acceptance criteria

- [ ] `data/exhibits.json` has exactly 77 entries: 12 built, 25 core, 39 extended, 1 open.
- [ ] Zone counts match BLUEPRINT §4 table exactly.
- [ ] `check-blueprint` passes, and fails with a clear message if you change one title in either file (prove it with a test fixture).
- [ ] Schema rejects: an unknown ID, a built exhibit with 2 stats, a stat pointing at a missing source, a "first" claim without caveat.
- [ ] All 12 built exhibits carry caption and stats identical to the prototype.
- [ ] Positions equal the seed to 3 decimals.

## Out of scope

Narration text, audio, MDX long-form content, any UI.

## Verify

```bash
pnpm --filter @museum/content test
pnpm --filter @museum/content exec tsx scripts/check-blueprint.ts
```

## Handoff

List in the PR every built exhibit still carrying `[TBD]` sources. Plan 13 requires them resolved before an exhibit counts as Built under CI rules.
