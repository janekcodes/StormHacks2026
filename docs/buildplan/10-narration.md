> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** the 12 built exhibits (narration text and audio)
> **Status:** Blocked until open decision 7 (voice) is recorded
> **Depends on:** 07, `docs/decisions/` voice licence record

# 10 · Narration pipeline and player

## Goal

Clicking an exhibit plays its narration in the museum voice with synced captions. Audio is generated at build time by `tools/narrate` (BLUEPRINT §12), never at runtime.

## Read first

- BLUEPRINT §0 rules 8 to 10, §8 rule 8 (spoken text), §12 (all of it)
- ElevenLabs docs: text to speech **with timestamps**, and pronunciation dictionaries. Check current model IDs and SDK method names before coding; do not trust memory.

## Gate

Do not start until `docs/decisions/` contains the chosen voice ID, its source (library or designed), and its licence terms. If missing, stop and report.

## Deliverables

```
tools/narrate/src/index.ts           CLI: narrate changed exhibits
tools/narrate/src/hash.ts            hash(narration + voiceId + modelId + settings)
packages/content/pronunciation/      dictionary (at least: ENIAC, Colossus, Hollerith, Al-Khwarizmi, Dijkstra, Engelbart, Jacquard, Lovelace, Shor)
packages/content/data/exhibits.json  narration text for the 12 built exhibits; audio fields filled by the tool
apps/web/public/audio/<ID>.<hash>.mp3 and .align.json
packages/scene/src/audio/Narrator.tsx     player, captions, controls
.github/workflows/narrate.yml        runs on changes to narration, uses repo secret
```

## Steps

1. **Write narration** for the 12 built exhibits: same facts as the caption (no extras), 25 to 45 seconds spoken, numbers and paired years written out (BLUEPRINT §8 rule 8). Put drafts in `docs/exhibits/<ID>.md` first, then copy into `exhibits.json`.
2. **CLI:** for each exhibit whose hash changed, call ElevenLabs TTS with timestamps using `NARRATION_MODEL` and `ELEVENLABS_VOICE_ID` from env; apply the pronunciation dictionary; write MP3 and alignment JSON; update the `audio` field. Unchanged exhibits make no API call.
3. **Alignment:** convert character timings to word timings for captions (store words with start/end ms).
4. **CI workflow:** runs only when `narration` text, voice or model changes; key comes from a GitHub secret; commits the generated files back or uploads them to the CDN bucket (record which in a decision).
5. **Player:** starts when the walk-to begins after a click (the click unlocks audio); captions under the overlay with the current word highlighted; play/pause, mute (persisted), speed 1× / 1.25×; stops on close, prev or next; exposes `interrupt()` for guide speech (12).
6. Respect `prefers-reduced-motion` for caption animation; captions always visible when audio plays.

## Acceptance criteria

- [ ] Running the CLI twice in a row makes zero API calls the second time.
- [ ] 12 audio files, each under 600 KB, each with an alignment file.
- [ ] Each pronunciation-dictionary name is spoken correctly (manual check, listed in the PR).
- [ ] Captions stay within 150 ms of the audio (test against alignment).
- [ ] The API key appears nowhere in the client bundle (grep the build output in CI).
- [ ] Mute persists across reloads.

## Out of scope

Guide speech (12), narration for unbuilt exhibits, other languages.

## Verify

```bash
pnpm --filter tools-narrate test
ELEVENLABS_API_KEY=... pnpm narrate --only B2 --dry-run
pnpm --filter web build && ! grep -r "ELEVENLABS" apps/web/.next/static
```

## Handoff

Character count used and the voice settings, recorded in the voice decision file.
