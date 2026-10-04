import { createHash } from 'node:crypto'

/**
 * Filename hash for a narration clip: sha256 over the narration text, the voice,
 * the model and the generation settings, first 8 hex chars. Any change to one of
 * those inputs produces a different filename, so changed exhibits regenerate and
 * unchanged exhibits make no API call.
 */
export function narrationHash(input: {
  narration: string
  voiceId: string
  modelId: string
  settings: string
}): string {
  const payload = [input.narration, input.voiceId, input.modelId, input.settings].join('\u0000')
  return createHash('sha256').update(payload).digest('hex').slice(0, 8)
}
