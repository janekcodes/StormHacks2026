/**
 * Engelbart's "Mother of All Demos" (December 9, 1968).
 *
 * The one interaction: move the pointer and click a hypertext link to jump
 * between linked notes, while a second cursor types alongside you. The notes
 * mirror what the demo showed: the mouse, windows and live collaboration.
 */

export interface Token {
  text: string
  /** Target note id when this word is a hypertext link. */
  link?: string
}

export interface Note {
  id: string
  title: string
  tokens: readonly Token[]
}

export const NOTES: readonly Note[] = [
  {
    id: 'demo',
    title: 'The demo',
    tokens: [
      { text: 'On' },
      { text: 'December' },
      { text: '9,' },
      { text: '1968,' },
      { text: 'Douglas' },
      { text: 'Engelbart' },
      { text: 'showed' },
      { text: 'the' },
      { text: 'mouse', link: 'mouse' },
      { text: ',' },
      { text: 'windows', link: 'windows' },
      { text: 'and' },
      { text: 'live' },
      { text: 'collaboration', link: 'collaboration' },
      { text: 'in' },
      { text: 'one' },
      { text: 'system.' }
    ]
  },
  {
    id: 'mouse',
    title: 'The mouse',
    tokens: [
      { text: 'Bill' },
      { text: 'English' },
      { text: 'built' },
      { text: 'the' },
      { text: 'first' },
      { text: 'mouse' },
      { text: 'in' },
      { text: '1964:' },
      { text: 'a' },
      { text: 'wooden' },
      { text: 'block' },
      { text: 'with' },
      { text: 'two' },
      { text: 'wheels' },
      { text: 'and' },
      { text: 'one' },
      { text: 'button.' },
      { text: 'Doug' },
      { text: 'showed' },
      { text: 'it' },
      { text: 'in' },
      { text: 'the' },
      { text: 'demo', link: 'demo' },
      { text: '.' }
    ]
  },
  {
    id: 'windows',
    title: 'Windows',
    tokens: [
      { text: 'NLS' },
      { text: 'put' },
      { text: 'text,' },
      { text: 'images' },
      { text: 'and' },
      { text: 'video' },
      { text: 'in' },
      { text: 'windows' },
      { text: 'on' },
      { text: 'one' },
      { text: 'screen.' },
      { text: 'It' },
      { text: 'was' },
      { text: 'all' },
      { text: 'part' },
      { text: 'of' },
      { text: 'the' },
      { text: 'demo', link: 'demo' },
      { text: '.' }
    ]
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    tokens: [
      { text: 'Two' },
      { text: 'people' },
      { text: 'edited' },
      { text: 'the' },
      { text: 'same' },
      { text: 'document' },
      { text: 'at' },
      { text: 'once,' },
      { text: 'one' },
      { text: 'in' },
      { text: 'San' },
      { text: 'Francisco' },
      { text: 'and' },
      { text: 'one' },
      { text: 'in' },
      { text: 'Menlo' },
      { text: 'Park.' },
      { text: 'See' },
      { text: 'the' },
      { text: 'demo', link: 'demo' },
      { text: '.' }
    ]
  }
]

export const START_NOTE = 'demo'

/** The line the partner cursor types into the shared note, from Menlo Park. */
export const PARTNER_LINE = 'Hello from Menlo Park'

export function noteById(id: string): Note | undefined {
  return NOTES.find((note) => note.id === id)
}

/** Target note id for a link token at `index`, or null if not a link. */
export function linkAt(note: Note, index: number): string | null {
  return note.tokens[index]?.link ?? null
}

/** Follow a link: return the target note id, or null if the token is not a link. */
export function jump(id: string, index: number): string | null {
  const note = noteById(id)
  if (!note) return null
  return linkAt(note, index)
}

/** Indices of all link tokens in a note, for keyboard roving focus. */
export function linkIndexes(note: Note): number[] {
  return note.tokens
    .map((token, index) => (token.link ? index : -1))
    .filter((index) => index >= 0)
}

/** Push a visit; jumping back to a known note truncates forward history. */
export function pushVisit(history: readonly string[], id: string): string[] {
  const idx = history.indexOf(id)
  const base = idx >= 0 ? history.slice(0, idx) : history
  return [...base, id]
}

/** The partner cursor's typed text at a given step, clamped to the full line. */
export function partnerText(step: number): string {
  const clamped = Math.max(0, Math.floor(step))
  return PARTNER_LINE.slice(0, clamped)
}
