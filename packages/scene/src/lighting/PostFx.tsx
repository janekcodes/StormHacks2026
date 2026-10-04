'use client'

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { HalfFloatType } from 'three'
import { settingsFor, type QualityTier } from '../quality'

/**
 * Interim ambient occlusion (N8AO) until the decision 0005 lightmap bake,
 * HDR bloom on case lights and signage (`high` only), SMAA, a soft vignette
 * and ACES tone mapping. Nothing on `low` (decision 0012).
 */
export function PostFx({ quality }: { quality: QualityTier }) {
  const s = settingsFor(quality)
  if (!s.post) return null
  const half = s.ao === 'half'
  if (s.bloom) {
    return (
      <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
        <N8AO aoRadius={1.1} distanceFalloff={0.6} intensity={2.4} color="#1a120c" halfRes={half} quality="medium" />
        <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.2} intensity={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
        <Vignette offset={0.32} darkness={0.42} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType}>
      <N8AO aoRadius={1.1} distanceFalloff={0.6} intensity={2.4} color="#1a120c" halfRes={half} quality="performance" />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  )
}
