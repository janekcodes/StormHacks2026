'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSessionId } from '../guide/session'
import { createVoiceController, type VoiceStatus } from './controller'
import { connectScribe } from './scribe'

async function fetchListenToken(): Promise<{ token: string; modelId: string }> {
  const res = await fetch(`/api/listen-token?sessionId=${encodeURIComponent(getSessionId())}`)
  if (!res.ok) throw new Error(`listen token failed: ${res.status}`)
  return (await res.json()) as { token: string; modelId: string }
}

export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [partial, setPartial] = useState('')
  const controller = useMemo(
    () =>
      createVoiceController({
        getToken: fetchListenToken,
        connect: connectScribe,
        onPartial: setPartial,
        onStatus: setStatus
      }),
    []
  )
  useEffect(() => () => controller.dispose(), [controller])

  return {
    status,
    partial,
    prefetch: controller.prefetch,
    start: async () => {
      setPartial('')
      await controller.start()
    },
    stop: controller.stop
  }
}
