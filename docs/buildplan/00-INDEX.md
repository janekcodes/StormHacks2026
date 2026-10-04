> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# Build plans: index

These plans turn the prototype into the production museum described in BLUEPRINT §10 to §13. Each plan is sized for **one Cursor agent session and one pull request**.

## How to run a plan in Cursor

1. Open the repo with `.cursor/rules/blueprint.mdc` in place (it always applies).
2. Start a new Agent chat. Attach `BLUEPRINT.md` and the plan file.
3. Prompt: *"Execute build plan NN. Follow its Steps in order. Stop when every Acceptance criterion passes and the Verify commands succeed. Do not touch anything listed in Out of scope."*
4. Review the diff against the plan's Acceptance criteria yourself before merging.
5. Tick the plan below and note the PR.

## Seed material (repo root `seed/`)

| File | What it is | Used by |
|---|---|---|
| `seed/exhibits.seed.json` | All 77 registry entries with tier, band, prototype portal mapping and 3D position (metres) | 02 |
| `seed/plan.reference.json` | The prototype's generated building geometry: walls, lintels, glass, rooms, era lines, marks, signs | 03 (golden tests) |
| `seed/prototype/*.dc.html` | Prototype source: the 3D building and the four portal artboards | 05, 07, 08, 09 |

The prototype files use a canvas-specific format (`<x-dc>` markup, `class Component extends DCLogic`). Treat them as **reference for behaviour and numbers**, never copy their structure.

## Plans

| # | Plan | Depends on | Blueprint | Status | PR |
|---|---|---|---|---|---|
| 01 | [Monorepo scaffold](01-monorepo-scaffold.md) | none | §10 | ☑ | abf1747 |
| 02 | [Content package](02-content-package.md) | 01 | §6, §7, §10 | ☑ | 48ed970 |
| 03 | [Plan geometry generator](03-plan-geometry.md) | 02 | §5, §10 | ☑ | e7830aa |
| 04 | [2D floor plan and exhibit pages](04-floor-plan-2d.md) | 03 | §5, §10 | ☑ | |
| 05 | [3D scene shell](05-scene-shell.md) | 03 | §5, §9, §10 | ☑ | |
| 06 | [Navmesh and travel](06-navmesh-travel.md) | 05 | §10, §11 | ☑ | |
| 07 | [Exhibit runtime and portal overlay](07-exhibit-runtime.md) | 06 | §7, §9 | ☑ | |
| 08 | [Port the 12 built portals](08-portal-packages.md) | 07 | §6, §7 | ☑ | |
| 09 | [Exhibit models and asset pipeline](09-exhibit-models.md) | 07 | §7, §10 | ☑ | |
| 10 | [Narration pipeline and player](10-narration.md) | 07, decision 7 | §12 | ☑ | |
| 11 | [Guide v1 (text)](11-guide-v1.md) | 06, 07 | §11 | ☑ | |
| 12 | [Guide speech](12-guide-speech.md) | 10, 11 | §11, §12 | ☐ | |
| 13 | [Template: build one Core exhibit](13-core-exhibit-template.md) | 08, 09, 10 | §7, §8 | reusable | |
| 14 | [UI polish and audit](14-ui-polish.md) | 05, 07, 11 | §9 | ☐ | |
| 15 | Curation, grouping and content pass | 14 | §2, §4, §6, §8 | ☑ | |
| 16 | Narration, GLB models and museum materials | 15 | §4, §7, §8, §12 | ☑ | |
| 17 | [Heritage museum environment](17-museum-environment.md) | 16, decision 12 | §5, §10 | ☐ | |
| 18 | [Design system and UI](18-design-system.md) | 14, 17, decision 12 | §9, §10 | ☐ | |

```
01 → 02 → 03 ─┬→ 04
              └→ 05 → 06 → 07 ─┬→ 08 ─┐
                               ├→ 09 ─┼→ 13 (×25 Core, E3 first)
                               ├→ 10 ─┘
                               └→ 11 → 12 (needs 10)
```

04 can run in parallel with 05 to 07. 08, 09 and 10 can run in parallel once 07 merges.

## Plan file format

Every plan has the same sections: **Goal**, **Read first**, **Deliverables**, **Steps**, **Acceptance criteria**, **Out of scope**, **Verify**, **Handoff**. New plans copy that shape and the header block above.
