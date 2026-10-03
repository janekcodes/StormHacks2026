> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Ready
> **Depends on:** none

# 01 · Monorepo scaffold

## Goal

An empty but fully wired monorepo matching BLUEPRINT §10 "Repository layout": every package exists, builds, lints, type-checks and runs an empty test, and CI runs all of it on every pull request.

## Read first

- BLUEPRINT §0 (rules), §10 (stack, layout, configuration, performance budget)

## Deliverables

```
package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json
.eslintrc / eslint.config, .prettierrc, .editorconfig, .nvmrc
.env.example
.github/workflows/ci.yml
apps/web/                     Next.js App Router app, TypeScript strict
packages/scene/               empty React component package
packages/content/             empty package (filled in 02)
packages/guide/               empty package (filled in 11)
packages/portals/_template/   a portal package template (see Steps)
tools/plan/                   empty Node CLI package
tools/narrate/                empty Node CLI package
seed/                         copy the three seed items here unchanged
docs/buildplan/               these plans
docs/decisions/0001-monorepo.md
```

## Steps

1. Initialise pnpm workspaces + Turborepo. Node LTS pinned in `.nvmrc`.
2. `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, path aliases `@museum/*` for packages.
3. Create `apps/web` with Next.js App Router, TypeScript, no Tailwind requirement (CSS Modules or vanilla-extract are fine; record the choice in `docs/decisions/0001-monorepo.md`).
4. Packages are named `@museum/scene`, `@museum/content`, `@museum/guide`, `@museum/portal-<id>`. Each has `src/index.ts`, `package.json` with `exports`, a `test` script, and one placeholder test.
5. `packages/portals/_template`: exports `{ id, meta, Portal }` where `Portal` is a React component taking `{ onClose(): void }`. This shape is the portal contract used in 07 and 08.
6. Turbo tasks: `build`, `lint`, `typecheck`, `test`, `test:e2e`, with correct `dependsOn` and outputs.
7. Vitest at the root with workspace projects. Playwright in `apps/web/e2e` with one smoke test that loads `/` and sees the page title.
8. `.env.example` lists every variable from BLUEPRINT §10 "Configuration", with empty values and a comment saying which are server-only.
9. CI (`ci.yml`): install with pnpm cache, then `turbo run lint typecheck test build`, then Playwright smoke. Fails on any error.
10. Add a size check job stub (`size-limit` or equivalent) for `apps/web` with the BLUEPRINT budget (initial load < 3 MB). It may be lenient now; it must exist.

## Acceptance criteria

- [ ] `pnpm i && pnpm turbo run lint typecheck test build` passes from a clean clone.
- [ ] `pnpm --filter web dev` serves a page titled "The NeXT-Gen Museum".
- [ ] Playwright smoke passes locally and in CI.
- [ ] No package imports another package by relative path; all use `@museum/*`.
- [ ] `.env.example` matches BLUEPRINT §10 exactly; no real values anywhere in git.
- [ ] `seed/` contents are byte-identical to what was provided.

## Out of scope

Any 3D code, any content schema, any API route, any styling beyond a plain page.

## Verify

```bash
pnpm i
pnpm turbo run lint typecheck test build
pnpm --filter web test:e2e
```

## Handoff

Note in the PR: chosen styling approach, Node version, and any deviation from the BLUEPRINT layout (there should be none).
