/**
 * Incremental sentence splitter for streamed guide text.
 *
 * Splits on `.`, `!` and `?` when followed by whitespace or the end of input,
 * while never splitting:
 *   - decimals ("2.56 MB", "1.5 gigahertz")
 *   - abbreviations ("c. 820" for circa, "e.g.", "i.e.", "etc.")
 *   - exhibit IDs (IDs carry no period, so a trailing "B4." stays a boundary)
 *   - quoted sentences (`He said "hello." Then he left.` splits into two)
 *
 * A lowercase single letter followed by a period is an abbreviation (circa),
 * so "c. 820" never splits. An uppercase single letter is a sentence end, so
 * "in wing B." splits correctly. The splitter is pure and client-safe: it is
 * re-exported from `@museum/guide/client` and shipped to the browser.
 */

const ABBREVIATIONS = new Set([
  'cf',
  'vs',
  'etc',
  'e.g',
  'i.e',
  'no',
  'fig',
  'approx',
  'dr',
  'mr',
  'mrs',
  'ms',
  'st',
  'prof',
  'al',
  'pp',
  'vol',
  'ed',
  'u.s',
  'u.k',
  'a.m',
  'p.m',
  'b.c',
  'a.d',
  'inc',
  'co',
  'dept'
])

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isLowercaseLetter(ch: string): boolean {
  return ch >= 'a' && ch <= 'z'
}

function isLetter(ch: string): boolean {
  const lower = ch.toLowerCase()
  return lower >= 'a' && lower <= 'z'
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

function isClosingQuote(ch: string): boolean {
  return ch === '"' || ch === '\u201d' || ch === '\u2019' || ch === "'" || ch === '\u00bb'
}

function isWordBoundary(ch: string | undefined): boolean {
  return (
    ch === undefined ||
    isWhitespace(ch) ||
    ch === '(' ||
    ch === '"' ||
    ch === '\u201c' ||
    ch === '\u2018' ||
    ch === "'"
  )
}

/** Whether the period at `index` is part of a decimal number (digit on both sides). */
function isDecimalDot(text: string, index: number): boolean {
  return (
    index > 0 &&
    index + 1 < text.length &&
    isDigit(text[index - 1]!) &&
    isDigit(text[index + 1]!)
  )
}

/**
 * Whether the period at `index` is an abbreviation dot (not a sentence end).
 * A standalone lowercase letter ("c." for circa) or a known token ("e.g.",
 * "U.S.") is held back. Uppercase single letters are treated as sentence ends
 * ("wing B.").
 */
function isAbbreviationDot(text: string, index: number): boolean {
  const prev = index - 1
  if (prev < 0) return false
  const before = prev - 1
  const beforeChar = before >= 0 ? text[before] : undefined
  if (isLowercaseLetter(text[prev]!) && isWordBoundary(beforeChar)) return true

  let start = index - 1
  while (start >= 0 && (isLetter(text[start]!) || text[start] === '.')) start--
  start++
  const word = text.slice(start, index).toLowerCase()
  return ABBREVIATIONS.has(word)
}

export interface SentenceSplitter {
  /** Feed a chunk of streamed text; returns any newly complete sentences. */
  push: (chunk: string) => string[]
  /** Return any remaining buffered text as a final sentence (if non-empty). */
  flush: () => string[]
  /** Discard buffered state (an interrupted answer). */
  reset: () => void
}

export function createSentenceSplitter(): SentenceSplitter {
  let buffer = ''

  /** `final`: end of input counts as a boundary (flush only). While streaming, the next chunk may continue a decimal or initialism. */
  function drain(final: boolean): string[] {
    const sentences: string[] = []
    let start = 0
    let i = 0
    while (i < buffer.length) {
      const ch = buffer[i]!
      if (ch !== '.' && ch !== '!' && ch !== '?') {
        i++
        continue
      }

      // Skip closing quotes that immediately follow the terminator.
      let j = i + 1
      while (j < buffer.length && isClosingQuote(buffer[j]!)) j++

      if (ch === '.') {
        if (isDecimalDot(buffer, i) || isAbbreviationDot(buffer, i)) {
          i++
          continue
        }
      }

      const boundary = j >= buffer.length ? final : isWhitespace(buffer[j]!)
      if (!boundary) {
        i++
        continue
      }

      const sentence = buffer.slice(start, j).trim()
      if (sentence) sentences.push(sentence)
      i = j
      while (i < buffer.length && isWhitespace(buffer[i]!)) i++
      start = i
    }
    buffer = buffer.slice(start)
    return sentences
  }

  return {
    push(chunk: string) {
      buffer += chunk
      return drain(false)
    },
    flush() {
      const done = drain(true)
      const rest = buffer.trim()
      buffer = ''
      return rest ? [...done, rest] : done
    },
    reset() {
      buffer = ''
    }
  }
}

/** One-shot convenience: split fully-streamed text into sentences. */
export function splitSentences(text: string): string[] {
  const splitter = createSentenceSplitter()
  return [...splitter.push(text), ...splitter.flush()]
}
