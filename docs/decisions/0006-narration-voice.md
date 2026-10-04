> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** none (museum voice for all narration and guide speech)
> **Status:** In review

# 0006 · Narration voice (BLUEPRINT open decision 7)

## Context

Plan 10 (narration pipeline and player) is gated on this decision: `docs/decisions/` must contain the chosen voice ID, its source (library or designed) and its licence terms before any narration is generated. BLUEPRINT open decision 7 asks "which museum voice (library or designed) and in which languages", with the default "one English library voice; more languages after Phase 2". BLUEPRINT §12 uses one voice for both the narrator and the guide, and BLUEPRINT §0 rule 9 forbids imitating a real person. This file records the voice, its source, its licence and the settings the narration tool will use.

## Decision

- **One English library voice** for both exhibit narration and guide speech. This confirms open decision 6's default (Gemini text + ElevenLabs speech, one consistent voice).
- **Source: library.** The voice comes from the ElevenLabs Voice Library (a shared, commercially cleared voice), not a Professional Voice Clone of a real person and not a Voice Design voice built to imitate anyone. This satisfies BLUEPRINT §0 rule 9.
- **Selected voice (approved 2026-10-03):** `Bill - Informative, Clean and Natural`, an English, neutral American, documentary-style library voice from ElevenLabs' Documentary Narrator collection. It reads as steady and factual, which suits exhibit narration, and its neutrality suits the guide. Approval is recorded here; the final pick still needs one human listen check before narration is generated.
- **Voice ID:** `JBFqnCBsd6RMkjVDRZzb` (Bill - Informative, Clean and Natural; confirmed 2026-10-03 and set in `ELEVENLABS_VOICE_ID`).
- **Model IDs are config, never hardcoded** (BLUEPRINT §0 rule 10): build-time narration uses `NARRATION_MODEL`, live guide speech uses `SPEECH_MODEL`. The voice's `verified_languages` must include English on the chosen narration model.
- **Pronunciation dictionary** (`packages/content/pronunciation`) covers at least the names in BLUEPRINT §12: ENIAC, Colossus, Hollerith, Al-Khwarizmi, Dijkstra, Engelbart, Jacquard, Lovelace, Shor. The voice must be re-checked against each name after the dictionary is applied.

## Voice licence

- ElevenLabs Voice Library voices are **cleared for broad commercial use** (ElevenLabs, "Voice Library": https://elevenlabs.io/blog/voice-library).
- **Commercial use requires a paid ElevenLabs subscription.** Free-tier accounts may use the service only non-commercially. Paid accounts may use it commercially, subject to the Prohibited Use Policy (ElevenLabs Terms of Use and Voice Library Addendum: https://elevenlabs.io/terms-of-use-eu, https://elevenlabs.io/vla).
- The museum pays for a commercial subscription, so narration and guide speech produced from the chosen library voice are licensed for the museum's use under those terms. All use remains subject to the ElevenLabs **Prohibited Use Policy**.
- Rule 9 check: the chosen voice is a professional voice-actor persona, not named after and not imitating a real public figure, so narration and guide speech do not imitate a real person.
- This decision is the licence record BLUEPRINT §12 requires. If the voice, model or subscription tier changes, update this file and regenerate audio (the hash includes voice ID and model ID, so the tool regenerates automatically).

## Generation settings

- **Output format:** `mp3_44100_96` (96 kbit/s MP3, 44.1 kHz). Keeps a 25 to 40 second clip well under the 600 KB budget.
- **Voice settings:** stability 0.5, similarity boost 0.75, style 0, speaker boost on (ElevenLabs defaults). Recorded here for the hash and the plan 10 handoff.
- **Hash:** sha256 over narration text + voice ID + model ID + the settings above, first 8 hex chars. Files are named `<ID>.<hash>.mp3` and `<ID>.<hash>.align.json`.
- **Pronunciation:** `packages/content/pronunciation/dictionary.json` maps canonical names to single-token phonetic hints. The tool substitutes them into the text sent to ElevenLabs (word count is preserved) and alignment maps back to the original spelling for captions.

## Consequences

- `ELEVENLABS_VOICE_ID` in `.env` / CI secret must be set to the confirmed library `voice_id`. Model IDs stay in `NARRATION_MODEL` / `SPEECH_MODEL`.
- Plan 10 can generate the 12 audio files once a paid subscription is confirmed and `NARRATION_MODEL` is set.
- The voice is English-only in Phase 2. More languages are a later decision (BLUEPRINT open decision 7).
