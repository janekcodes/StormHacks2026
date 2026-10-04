import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { charactersToWords, tokenize, type AlignmentFile } from './alignment'
import { synthesize, type SynthesisResult } from './client'
import { narrationHash } from './hash'
import { applyPronunciation, type PronunciationDictionary } from './pronunciation'

export const NARRATION_SETTINGS = {
  outputFormat: 'mp3_44100_96',
  voiceSettings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true }
} as const

export function narrationSettingsJson(): string {
  return JSON.stringify(NARRATION_SETTINGS)
}

export interface NarrateExhibitInput {
  id: string
  narration: string
  voiceId: string
  modelId: string
  apiKey: string
  audioDir: string
  dictionary: PronunciationDictionary
  /** Existing audio hash, if the exhibit already has generated audio. */
  existingHash?: string
  /** Test seam: inject synthesis instead of calling ElevenLabs. */
  synth?: (text: string) => Promise<SynthesisResult>
}

export interface NarrateExhibitOutput {
  hash: string
  src: string
  align: string
  changed: boolean
  durationMs: number | null
}

export function computeAudioRecord(
  id: string,
  narration: string,
  voiceId: string,
  modelId: string
): { hash: string; src: string; align: string } {
  const hash = narrationHash({ narration, voiceId, modelId, settings: narrationSettingsJson() })
  return {
    hash,
    src: `/audio/${id}.${hash}.mp3`,
    align: `/audio/${id}.${hash}.align.json`
  }
}

/**
 * Generate one exhibit's narration: apply the pronunciation dictionary, call
 * ElevenLabs with timestamps, convert character timings to word timings, and
 * write the MP3 and alignment JSON. Skips synthesis when the hash is unchanged.
 */
export async function narrateExhibit(input: NarrateExhibitInput): Promise<NarrateExhibitOutput> {
  const { id, narration, voiceId, modelId, apiKey, audioDir, dictionary } = input
  const record = computeAudioRecord(id, narration, voiceId, modelId)

  if (input.existingHash === record.hash) {
    return { ...record, changed: false, durationMs: null }
  }

  const spoken = applyPronunciation(narration, dictionary)
  const result = input.synth
    ? await input.synth(spoken)
    : await synthesize({
        apiKey,
        voiceId,
        modelId,
        text: spoken,
        outputFormat: NARRATION_SETTINGS.outputFormat
      })

  const words = charactersToWords(result.characters, result.starts, result.ends, tokenize(narration))
  const alignment: AlignmentFile = { words }

  mkdirSync(audioDir, { recursive: true })
  writeFileSync(join(audioDir, `${id}.${record.hash}.mp3`), result.audio)
  writeFileSync(join(audioDir, `${id}.${record.hash}.align.json`), JSON.stringify(alignment, null, 2) + '\n')

  return { ...record, changed: true, durationMs: words.length > 0 ? words[words.length - 1]!.endMs : null }
}
