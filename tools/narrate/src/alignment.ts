export interface NarrationWord {
  text: string
  startMs: number
  endMs: number
}

export interface AlignmentFile {
  words: NarrationWord[]
}

/** Split text into whitespace-delimited tokens. */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((token) => token.length > 0)
}

/**
 * Group ElevenLabs character-level alignment into words, then zip with the
 * original narration words so captions show the correct spelling even when the
 * synthesised text used phonetic hints.
 */
export function charactersToWords(
  characters: readonly string[],
  starts: readonly number[],
  ends: readonly number[],
  sourceWords: readonly string[]
): NarrationWord[] {
  const spans: Array<{ start: number; end: number }> = []
  let current: { start: number; end: number } | null = null

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i] ?? ''
    if (char.trim() === '') {
      if (current) {
        spans.push(current)
        current = null
      }
      continue
    }
    const start = starts[i] ?? 0
    const end = ends[i] ?? start
    if (current) {
      current.end = Math.max(current.end, end)
    } else {
      current = { start, end }
    }
  }
  if (current) spans.push(current)

  if (spans.length !== sourceWords.length) {
    throw new Error(
      `alignment word count ${spans.length} does not match narration word count ${sourceWords.length}`
    )
  }

  return sourceWords.map((text, index) => {
    const span = spans[index]
    return {
      text,
      startMs: Math.round((span?.start ?? 0) * 1000),
      endMs: Math.round((span?.end ?? 0) * 1000)
    }
  })
}
