/** 14.4 kbit/s. Bytes to seconds is bits divided by the line rate. */
export const BITRATE = 14_400
export const FIRST_PAGE_BYTES = 2_048
export const MEDIAN_PAGE_BYTES = 2_560_000

export function transferSeconds(bytes: number, bitrate = BITRATE): number {
  return (bytes * 8) / bitrate
}

export const FIRST_PAGE_SECONDS = transferSeconds(FIRST_PAGE_BYTES)
export const MEDIAN_PAGE_SECONDS = transferSeconds(MEDIAN_PAGE_BYTES)

/** Real time until the small page lands (plus a short beat), then 100x (5s per 0.05s tick). */
export const REAL_STEP_S = 0.05
export const FAST_STEP_S = 5

export function nextClock(t: number, firstPageSeconds = FIRST_PAGE_SECONDS): number {
  if (t < firstPageSeconds + 0.5) return t + REAL_STEP_S
  return t + FAST_STEP_S
}

export function progress(t: number, total: number): number {
  if (total <= 0) return 1
  return Math.min(1, t / total)
}

export function clockLabel(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}
