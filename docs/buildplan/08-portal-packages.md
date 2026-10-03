> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** A1, B2, B3, B11, C1, C3, C10, D6, D7, F2, F7, F10
> **Status:** Ready
> **Depends on:** 07

# 08 · Port the 12 built portals

## Goal

Split the prototype's four era portal artboards into twelve portal packages, one per exhibit ID, each with its interaction logic separated from its UI and covered by unit tests.

## Read first

- BLUEPRINT §6 note on portals, §7 (Portal and Accessibility rows), §8 (rules 3 and 4)
- `seed/prototype/Portal1945.dc.html`, `Portal1956.dc.html`, `Portal1991.dc.html`, `Portal2026.dc.html`
- `packages/portals/_template` (from 01)

## Deliverables

For each ID, `packages/portals/<id>/` (lowercase, for example `portal-b11`):

```
src/logic.ts        pure functions, no React, no DOM
src/Portal.tsx      UI using logic.ts
src/index.ts        export { id, meta, Portal }
test/logic.test.ts
```

Plus each exhibit's `portal.package` set in `exhibits.json`.

## Mapping from the prototype

| ID | From | `exhibit` prop | Logic to extract and test |
|---|---|---|---|
| A1 | Portal1945 | ai | Binary incrementer Turing machine: 6-rule table; tape `___1011_____` (12 cells) with the head at index 3 halts with `1100` (11 → 12) |
| B2 | Portal1945 | hw | 350-dot tube wall (1 dot = 50 tubes); dead set, replace, power-cycle picks 3 to 5 dead |
| C1 | Portal1945 | sw | Plugboard programs A (add) and B (multiply): cable routes and the stored-program listing |
| B3 | Portal1956 | hw | Transistor switch state; lamp on iff base on |
| C3 | Portal1956 | sw | Hollerith encoding: digits = row; A..I = 12 + 1..9; J..R = 11 + 1..9; S..Z = 0 + 2..9; `=` = 6-8; `+` = 12-6-8; `,` = 0-3-8; label cols 1 to 5, statement 7 to 72, ID 73 to 80 |
| F2 | Portal1956 | ai | Four proposers and notes; Logic Theorist counter stops at 38 of 52 |
| D6 | Portal1991 | hw | Modem race at 14.4 kbit/s: 2,048 B → 1.14 s; 2,560,000 B → 1,422 s; real time until the small page lands, then 100× |
| D7 | Portal1991 | sw | Web mode toggle (2026 vs 1991) and the stat set per mode |
| F7 | Portal1991 | ai | Positions = 35^d for d in 1..12; time at 700,000/s and 200,000,000/s; duration formatter |
| B11 | Portal2026 | hw | 4×4 systolic array: cell (i,j) has accumulated Σ A[i][k]·B[k][j] for i+j+k < t; done at t = 10 with 64 MACs |
| C10 | Portal2026 | sw | Waffle: 632 squares (median mobile JS, 2025) vs 2 squares (first page) |
| F10 | Portal2026 | ai | 8×8 illustrative attention matrix (rows sum to 1); next-token sampler over 4 steps |

## Steps

1. For each ID, move the pure logic into `logic.ts` first, write the tests, then rebuild the UI in React reading from it.
2. Keep each portal's colour scheme from the prototype (1945 amber, 1956 green, 1991 grey-white, 2026 cyan) as CSS variables in the package.
3. Every control is a real `<button>`/`<input>` with a label; focus visible; animations respect `prefers-reduced-motion`.
4. F10 and its next-token panel visibly say "illustrative" (BLUEPRINT §8 rule 3). D6 and C10 cite the HTTP Archive Web Almanac 2025 in their UI.
5. Captions, stats and titles come from `@museum/content`, never duplicated in the package.
6. Delete nothing from `seed/`; it stays as reference.

## Acceptance criteria

- [ ] 12 packages, each a separate lazy chunk under the 150 KB JS budget.
- [ ] Unit tests include at least these exact checks:
  - A1 ends in state `halt` with tape reading `1100`.
  - C3 encodes `ISUM = ISUM + I` column by column to the expected row sets (fixture).
  - D6 large page time is 1,422 s ± 1.
  - B11 final matrix is `[[5,6,2,8],[3,6,8,11],[5,1,5,6],[3,4,3,4]]` with 64 MACs at t = 10.
  - F10 every row sums to 1 ± 0.001.
- [ ] Each portal opens from the 3D overlay and from `/exhibit/<id>` (2D page embeds it too).
- [ ] axe: no serious violations inside any portal.

## Out of scope

New portals, new exhibits, narration, visual redesign.

## Verify

```bash
pnpm turbo run test --filter "./packages/portals/*"
pnpm --filter web build
```

## Handoff

Note any behaviour you found ambiguous in the prototype and how you resolved it.
