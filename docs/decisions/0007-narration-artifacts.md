> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** the 12 built exhibits (audio artifacts)
> **Status:** Draft

# 0007 · Narration artifacts are committed, not uploaded

## Context

Plan 10 step 4 requires recording whether generated narration audio is committed back to the repo or uploaded to a CDN bucket. BLUEPRINT §10 lists "Static assets and audio on the CDN" with hosting on Vercel or Cloudflare Pages.

## Decision

- Generated narration is **committed to the repo** under `apps/web/public/audio/<ID>.<hash>.mp3` and `apps/web/public/audio/<ID>.<hash>.align.json`.
- In Phase 2 there is no external bucket. The hosting platform serves `apps/web/public/` as the static asset root, which is the CDN. Committing keeps audio reproducible and reviewable next to its narration text.
- `tools/narrate` regenerates only changed exhibits. The CI workflow commits the new files back when a narration change lands.

## Consequences

- 12 clips under 600 KB each is a few MB total, acceptable in git. Move to git LFS or a bucket only if the collection grows past a few tens of MB.
- CI must be able to push back to the branch, so it uses a repo secret and a dedicated token.
