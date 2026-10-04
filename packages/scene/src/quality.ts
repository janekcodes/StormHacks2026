import { getGPUTier } from 'detect-gpu'

export type QualityTier = 'high' | 'balanced' | 'low'

export interface QualitySettings {
  tier: QualityTier
  dpr: [number, number]
  shadowMapSize: number
  shadows: boolean
  environment: boolean
}

export function settingsFor(tier: QualityTier): QualitySettings {
  switch (tier) {
    case 'high':
      return { tier, dpr: [1, 2], shadowMapSize: 2048, shadows: true, environment: true }
    case 'balanced':
      return { tier, dpr: [1, 1.25], shadowMapSize: 1024, shadows: true, environment: true }
    case 'low':
      return { tier, dpr: [1, 1], shadowMapSize: 0, shadows: false, environment: false }
  }
}

/** Map detect-gpu tier to museum quality. */
export async function detectQuality(): Promise<QualityTier> {
  try {
    const gpu = await getGPUTier()
    if (gpu.tier >= 3) return 'high'
    if (gpu.tier >= 2) return 'balanced'
    return 'low'
  } catch {
    return 'balanced'
  }
}
