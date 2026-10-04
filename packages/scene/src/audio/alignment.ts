export interface NarrationWord {
  text: string
  startMs: number
  endMs: number
}

export interface AlignmentFile {
  words: NarrationWord[]
}

/** Parse a narration alignment JSON produced by tools/narrate. */
export function parseAlignment(json: unknown): AlignmentFile {
  if (typeof json !== 'object' || json === null) {
    throw new Error('invalid alignment file')
  }
  const words = (json as { words?: unknown }).words
  if (!Array.isArray(words)) {
    throw new Error('invalid alignment file: words missing')
  }
  return {
    words: words.map((raw, index) => {
      const item = raw as { text?: unknown; startMs?: unknown; endMs?: unknown }
      if (typeof item.text !== 'string') {
        throw new Error(`alignment word ${index} is missing text`)
      }
      if (typeof item.startMs !== 'number' || typeof item.endMs !== 'number') {
        throw new Error(`alignment word ${index} is missing timings`)
      }
      return { text: item.text, startMs: item.startMs, endMs: item.endMs }
    })
  }
}
