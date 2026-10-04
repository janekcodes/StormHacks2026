import { getGPUTier } from 'detect-gpu'

export type QualityTier = 'high' | 'balanced' | 'low'

export interface QualitySettings {
  tier: QualityTier
  dpr: [number, number]
  shadowMapSize: number
  shadows: boolean
  /** Image-based lighting from the Lightformer room probe (all tiers, decision 0012). */
  environment: boolean
  /** PBR texture size streamed after the first frame; 0 keeps flat colours. */
  textureSize: 0 | 512 | 1024
  /** Post-processing: N8AO ambient occlusion (`half` renders at half resolution). */
  ao: 'full' | 'half' | false
  bloom: boolean
  /** Composer pass chain (SMAA, vignette, tone mapping). Off on `low`. */
  post: boolean
}

export function settingsFor(tier: QualityTier): QualitySettings {
  switch (tier) {
    case 'high':
      return {
        tier,
        dpr: [1, 2],
        shadowMapSize: 2048,
        shadows: true,
        environment: true,
        textureSize: 1024,
        ao: 'full',
        bloom: true,
        post: true
      }
    case 'balanced':
      return {
        tier,
        dpr: [1, 1.25],
        shadowMapSize: 1024,
        shadows: true,
        environment: true,
        textureSize: 512,
        ao: 'half',
        bloom: false,
        post: true
      }
    case 'low':
      return {
        tier,
        dpr: [1, 1],
        shadowMapSize: 0,
        shadows: false,
        environment: true,
        textureSize: 0,
        ao: false,
        bloom: false,
        post: false
      }
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
