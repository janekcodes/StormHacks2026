export interface ScribeConnection {
  onPartial(fn: (text: string) => void): void
  onCommitted(fn: (text: string) => void): void
  onError(fn: (error: unknown) => void): void
  onClose(fn: () => void): void
  commit(): void
  close(): void
}

export type ConnectScribe = (opts: { token: string; modelId: string }) => Promise<ScribeConnection>
export type VoiceStatus = 'idle' | 'listening' | 'finishing' | 'unavailable'

export const MIN_WORDS = 2

/** Tokens expire after 15 minutes; discard prefetched ones older than 10. */
const MAX_TOKEN_AGE_MS = 10 * 60 * 1000

type Token = { token: string; modelId: string }

export interface VoiceControllerDeps {
  getToken: () => Promise<Token>
  connect: ConnectScribe
  onPartial: (text: string) => void
  onStatus: (status: VoiceStatus) => void
  finalTimeoutMs?: number
  /** Clock, injectable for tests. */
  now?: () => number
}

/**
 * Push-to-talk over a realtime Scribe session. Press opens a session with a
 * single-use token; release commits, waits briefly for the final transcript,
 * and closes. Any failure marks the controller unavailable so the UI can
 * switch to a text box.
 */
export function createVoiceController(deps: VoiceControllerDeps) {
  const finalTimeoutMs = deps.finalTimeoutMs ?? 1500
  const now = deps.now ?? Date.now
  let pending: { promise: Promise<Token>; at: number } | null = null
  let conn: ScribeConnection | null = null
  let phase: 'idle' | 'listening' | 'finishing' = 'idle'
  let partial = ''
  let committed: string[] = []
  let wake: (() => void) | null = null
  let unavailable = false
  // Press generation: bumped on cancel so a start() resuming from an await can tell it is stale.
  let gen = 0
  let starting: number | null = null

  const status = (next: VoiceStatus) => deps.onStatus(next)

  // Idempotent: clearing conn first means our own close is ignored by onClose and never repeated.
  const closeActive = () => {
    const active = conn
    conn = null
    active?.close()
  }

  const fail = () => {
    unavailable = true
    phase = 'idle'
    closeActive()
    wake?.()
    status('unavailable')
  }

  const refill = () => {
    const entry = { promise: deps.getToken(), at: now() }
    pending = entry
    entry.promise.catch(() => {
      if (pending === entry) pending = null
    })
  }

  const takeToken = () => {
    const entry = pending
    pending = null
    if (entry && now() - entry.at <= MAX_TOKEN_AGE_MS) return entry.promise
    return deps.getToken()
  }

  return {
    prefetch() {
      if (unavailable) return
      if (!pending || now() - pending.at > MAX_TOKEN_AGE_MS) refill()
    },
    async start() {
      if (starting !== null || conn || unavailable) return
      const mine = ++gen
      starting = mine
      partial = ''
      committed = []
      try {
        const { token, modelId } = await takeToken()
        if (mine !== gen) return
        const next = await deps.connect({ token, modelId })
        if (mine !== gen) {
          next.close()
          return
        }
        conn = next
        phase = 'listening'
        next.onPartial((text) => {
          if (conn !== next) return
          partial = text
          deps.onPartial(text)
        })
        next.onCommitted((text) => {
          if (conn !== next) return
          if (text.trim()) committed.push(text.trim())
          wake?.()
        })
        next.onError(() => {
          if (conn === next) fail()
        })
        next.onClose(() => {
          if (conn !== next) return
          if (phase === 'listening') fail()
          else wake?.()
        })
        status('listening')
        refill()
      } catch {
        if (mine === gen) fail()
      } finally {
        if (starting === mine) starting = null
      }
    },
    async stop(): Promise<string | null> {
      if (starting !== null) {
        // Released while still connecting: cancel the press.
        gen++
        starting = null
        return null
      }
      const active = conn
      if (!active || phase !== 'listening') return null
      phase = 'finishing'
      status('finishing')
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, finalTimeoutMs)
        wake = () => {
          clearTimeout(timer)
          resolve()
        }
        try {
          active.commit()
        } catch {
          fail()
        }
      })
      wake = null
      if (unavailable) return null
      phase = 'idle'
      closeActive()
      status('idle')
      const text = (committed.length > 0 ? committed.join(' ') : partial).trim()
      return text.split(/\s+/).filter(Boolean).length >= MIN_WORDS ? text : null
    },
    dispose() {
      gen++
      starting = null
      phase = 'idle'
      closeActive()
    }
  }
}
