export const MIN_DEPTH = 1
export const MAX_DEPTH = 12
export const DEEP_THOUGHT_PER_S = 700_000
export const DEEP_BLUE_PER_S = 200_000_000

export function positions(depth: number): number {
  if (!Number.isInteger(depth) || depth < MIN_DEPTH || depth > MAX_DEPTH) {
    throw new Error('depth must be an integer from 1 to 12')
  }
  return 35 ** depth
}

export function searchSeconds(depth: number, perSecond: number): number {
  return positions(depth) / perSecond
}

/** Duration formatter from the 1991 portal. Year length is 365.25 days. */
export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`
  if (seconds < 31_557_600) return `${(seconds / 86400).toFixed(1)} days`
  const years = seconds / 31_557_600
  if (years < 1e6) return `${Math.round(years).toLocaleString('en-US')} years`
  return `${years.toExponential(1)} years`
}

export function formatCount(n: number): string {
  if (n < 1e6) return Math.round(n).toLocaleString('en-US')
  const units: readonly [number, string][] = [
    [1e18, 'quintillion'],
    [1e15, 'quadrillion'],
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million']
  ]
  for (const [unit, name] of units) {
    if (n >= unit) return `${(n / unit).toFixed(1)} ${name}`
  }
  return String(n)
}
