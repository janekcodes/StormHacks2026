'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSessionId } from '../guide/session'
import { createTokenCache, createVoiceController, type VoiceStatus } from './controller'

async function fetchListenToken(): Promise<{ token: string; modelId: string }> {
  const res = await fetch(`/api/listen-token?sessionId=${encodeURIComponent(getSessionId())}`)
  if (!res.ok) throw new Error(`listen token failed: ${res.status}`)
  return (await res.json()) as { token: string; modelId: string }
}

// Module level so the warm token survives the floating/inline TourBar remount
// that happens at every tour stop (one hook instance is mounted at a time).
const sharedTokens = createTokenCache(fetchListenToken)
const loadScribe = () => import('./scribe')

export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [partial, setPartial] = useState('')
  const controller = useMemo(
    () =>
      createVoiceController({
        getToken: fetchListenToken,
        tokens: sharedTokens,
        // Lazy: keeps the ElevenLabs SDK out of the main bundle; warmed on prefetch, before the first press.
        connect: async (opts) => (await loadScribe()).connectScribe(opts),
        warm: () => void loadScribe().catch(() => undefined),
        onPartial: setPartial,
        onStatus: setStatus
      }),
    []
  )
  useEffect(() => () => controller.dispose(), [controller])

  const start = useCallback(async () => {
    setPartial('')
    await controller.start()
  }, [controller])

  return useMemo(
    () => ({ status, partial, prefetch: controller.prefetch, start, stop: controller.stop }),
    [status, partial, controller, start]
  )
}
