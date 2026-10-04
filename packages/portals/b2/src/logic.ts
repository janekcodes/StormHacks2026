/** One dot stands for 50 tubes. 350 dots is about 17,500 tubes. */
export const DOTS = 350
export const TUBES_PER_DOT = 50

export const INITIAL_DEAD: readonly number[] = [37, 158, 290]

export function replaceTube(dead: readonly number[], index: number): number[] {
  return dead.filter((dot) => dot !== index)
}

/** Power-cycle knocks out 3, 4 or 5 dots. */
export function deadCount(randomUnit: number): number {
  const unit = Math.min(0.999999, Math.max(0, randomUnit))
  return 3 + Math.floor(unit * 3)
}

export function powerCycle(random: () => number): number[] {
  const count = deadCount(random())
  const dead = new Set<number>()
  let guard = 0
  while (dead.size < count && guard < DOTS * 8) {
    dead.add(Math.floor(random() * DOTS))
    guard += 1
  }
  return [...dead]
}

export function okCount(dead: readonly number[]): number {
  return DOTS - dead.length
}
