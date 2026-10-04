/** Hollerith rows, top to bottom, as punched on an IBM card. */
export const ROWS = ['12', '11', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
export type Row = (typeof ROWS)[number]

export const CARD_COLUMNS = 80
/** Identification field used by the prototype card. The plan names the columns, not the text. */
export const ID_FIELD = 'MUSEUM01'

export interface FortranStatement {
  label: string
  statement: string
}

export function rowsFor(ch: string): Row[] {
  if (/^[0-9]$/.test(ch)) return [ch as Row]
  if (/^[A-I]$/.test(ch)) return ['12', String(ch.charCodeAt(0) - 64) as Row]
  if (/^[J-R]$/.test(ch)) return ['11', String(ch.charCodeAt(0) - 73) as Row]
  if (/^[S-Z]$/.test(ch)) return ['0', String(ch.charCodeAt(0) - 81) as Row]
  if (ch === '=') return ['6', '8']
  if (ch === '+') return ['12', '6', '8']
  if (ch === ',') return ['0', '3', '8']
  return []
}

/**
 * FORTRAN card: label in columns 1 to 5, blank column 6, statement in 7 to 72, id in 73 to 80.
 * The prototype padded the label with three spaces, which pushed the statement into the label field.
 * This follows the column map in the plan instead.
 */
export function cardLine(stmt: FortranStatement): string {
  const label = stmt.label.padStart(5, ' ').slice(-5)
  const statement = stmt.statement.slice(0, 66)
  const line = `${label} ${statement}`.padEnd(72, ' ').slice(0, 72) + ID_FIELD
  if (line.length !== CARD_COLUMNS) {
    throw new Error(`card line is ${line.length} columns`)
  }
  return line
}

export function columnRows(line: string): Row[][] {
  return [...line].map((ch) => rowsFor(ch))
}

export const STATEMENTS: readonly { label: string; statement: string; button: string }[] = [
  { label: '', statement: 'ISUM = ISUM + I', button: 'ISUM = ISUM + I' },
  { label: '', statement: 'DO 10 I = 1, 10', button: 'DO 10 I = 1, 10' },
  { label: '10', statement: 'CONTINUE', button: '10 CONTINUE' }
]
