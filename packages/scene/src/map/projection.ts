/** Matches `tools/plan` SVG output: metres → plan.svg pixels. */
export const PLAN_PX_PER_M = 10
export const PLAN_ORIGIN_X_M = 30
export const PLAN_ORIGIN_Z_M = 19
export const PLAN_WIDTH_PX = 620
export const PLAN_HEIGHT_PX = 440

export function toSvg(x: number, z: number): { x: number; y: number } {
  return {
    x: (x + PLAN_ORIGIN_X_M) * PLAN_PX_PER_M,
    y: (z + PLAN_ORIGIN_Z_M) * PLAN_PX_PER_M
  }
}

export function fromSvg(svgX: number, svgY: number): { x: number; z: number } {
  return {
    x: svgX / PLAN_PX_PER_M - PLAN_ORIGIN_X_M,
    z: svgY / PLAN_PX_PER_M - PLAN_ORIGIN_Z_M
  }
}
