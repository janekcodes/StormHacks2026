/** 1 square = 1 KB. Median mobile JavaScript, HTTP Archive Web Almanac 2025. */
export const JS_SQUARES = 632
export const FIRST_PAGE_SQUARES = 2

export type WaffleMode = 'js' | 'first'

export const ALMANAC_CITE = 'HTTP Archive Web Almanac 2025'

export function litSquares(mode: WaffleMode): number {
  return mode === 'js' ? JS_SQUARES : FIRST_PAGE_SQUARES
}

export function waffleLabel(mode: WaffleMode): string {
  if (mode === 'js') return '632 KB of JavaScript (median mobile home page, 2025)'
  return '~2 KB: the entire first web page, 1991'
}

export function waffleNote(mode: WaffleMode): string {
  if (mode === 'js') {
    return `That is JavaScript alone. The whole median mobile home page weighs 2.56 MB across 75 requests (${ALMANAC_CITE}).`
  }
  return 'Two squares. Text, headings and links: the semantic core that still carries most of a page\'s meaning today.'
}
