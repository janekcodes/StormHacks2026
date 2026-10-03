> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Final

# 0001 · Monorepo scaffold decisions

## Context

Plan 01 sets up the production monorepo described in BLUEPRINT section 10. This file records the choices the plan left open.

## Decisions

- **Styling:** CSS Modules. Plain and dependency-free, no Tailwind requirement. Vanilla-extract was considered and rejected as heavier than plan 01 needs.
- **Node version:** 24 (current LTS), pinned in `.nvmrc`.
- **Package manager:** pnpm 9.15.0 with workspaces, plus Turborepo for task orchestration.
- **TypeScript:** strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, pinned to 5.9.x. TypeScript 7 and newer are not yet supported by the `typescript-eslint` peer range.
- **Linting:** ESLint 9 flat config, shared from the repo root. Each package re-exports the root config so `eslint .` works per package.
- **Testing:** Vitest 3 at the root (workspace projects) for unit tests; Playwright for the web shell smoke test.
- **Size check:** a small Node script (`apps/web/scripts/check-size.mjs`) that sums `.next/static` and fails over 3 MB. It is a stub for now and may be replaced by `size-limit` later.

## Consequences

- Every package declares its own tooling devDependencies so `pnpm run` works per package without relying on hoisting.
- Package naming follows BLUEPRINT section 10: `@museum/scene`, `@museum/content`, `@museum/guide`, `@museum/portal-<id>`; tools are `@museum/plan` and `@museum/narrate`.

## Deviation from BLUEPRINT layout

None. The build plans live in `docs/buildplan/` and the seed material in `seed/`, matching the build plan index and the `.cursor/rules/blueprint.mdc` rule.
