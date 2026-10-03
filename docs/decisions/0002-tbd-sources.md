> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** A1, B2, B3, B11, C1, C3, C10, D6, D7, F2, F7, F10
> **Status:** Final

# 0002 · TBD markers in exhibit sources

## Context

Plan 02 imports the 77 exhibit registry entries into `packages/content/data/exhibits.json`. The 12 built exhibits carry captions and stats copied from the prototype (`seed/prototype/MuseumBuilding.dc.html`), but the prototype never recorded sources for those facts. BLUEPRINT section 0 rule 4 and section 8 require every fact to have a source, and plan 02 step 3 instructs that these sources be recorded as `[TBD]` for now.

## Decision

- The 12 built exhibits use `[TBD: source]` for their `stats[].sourceId` and for every field of their single `sources[]` entry.
- The exhibit schema accepts TBD markers only when the `allowTbd` option is on. `ExhibitSchema` defaults to `allowTbd: true` (plans 02 to 12); `StrictExhibitSchema` sets `allowTbd: false`.
- Plan 13 CI flips to `StrictExhibitSchema`, so no exhibit counts as Built under CI rules until its sources are real.

## Consequences

- `check-blueprint` passes today because it compares registry fields only (ID, year, title, zone, band, tier), none of which are TBD.
- The 12 built exhibits still carrying `[TBD]` sources: A1, B2, B3, B11, C1, C3, C10, D6, D7, F2, F7, F10.
- Plan 13 must resolve those sources before any of these exhibits count as Built under strict CI validation.
