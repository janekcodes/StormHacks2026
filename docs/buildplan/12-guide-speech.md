> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none
> **Status:** Ready after 10 and 11
> **Depends on:** 10, 11

# 12 · Guide speech

## Goal

The guide can speak its answers in the same museum voice as the narration, streamed sentence by sentence so speech starts while Gemini is still writing.

## Read first

- BLUEPRINT §12 "Live guide speech" and "Playback rules", §0 rules 8 to 10
- ElevenLabs streaming TTS docs (current model IDs and SDK methods)

## Deliverables

```
apps/web/app/api/speak/route.ts        POST text → streamed audio; server-only key; rate limited
packages/guide/src/sentences.ts        incremental sentence splitter for streamed text
packages/scene/src/audio/GuideVoice.tsx   queue, playback, interrupt, captions
```

## Steps

1. Sentence splitter: emits a sentence on `. ! ?` followed by space or end, never splitting decimals ("2.56 MB"), abbreviations ("c. 820") or exhibit IDs. Unit-tested.
2. `/api/speak`: takes one sentence, calls ElevenLabs with `SPEECH_MODEL` and `ELEVENLABS_VOICE_ID`, streams audio back. Shares the guide's session rate limit.
3. `GuideVoice`: queues sentences in order, plays them gaplessly, shows the current sentence as a caption, calls `Narrator.interrupt()` before speaking, and stops instantly when the visitor types, closes the panel or presses Stop.
4. Speech is opt-in: a "Speak answers" toggle in the guide panel, off by default, remembered.

## Acceptance criteria

- [ ] First audio plays under 1.5 s after the first sentence finishes streaming (measured, in the PR).
- [ ] Narration and guide speech never overlap.
- [ ] Splitter tests pass for decimals, abbreviations, IDs, and quotes.
- [ ] Key never reaches the client.

## Out of scope

Gemini Live voice conversation (open decision 6), voice input.

## Verify

```bash
pnpm --filter @museum/guide test -- sentences
pnpm --filter web test:e2e -- guide-speech.spec.ts   # mocked audio
```

## Handoff

Measured latency and character usage per average answer.
