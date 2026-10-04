import { readFileSync } from 'node:fs'

/** Canonical term to single-token phonetic hint. Hints must not contain whitespace. */
export type PronunciationDictionary = Record<string, string>

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace canonical names with their phonetic hints, case-insensitively, at word
 * boundaries. Each hint is a single token (no whitespace) so the word count is
 * unchanged and the alignment maps back to the original spelling by index.
 */
export function applyPronunciation(text: string, dictionary: PronunciationDictionary): string {
  let out = text
  for (const [term, hint] of Object.entries(dictionary)) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi')
    out = out.replace(pattern, hint)
  }
  return out
}

export function loadPronunciation(path: string): PronunciationDictionary {
  return JSON.parse(readFileSync(path, 'utf8')) as PronunciationDictionary
}
