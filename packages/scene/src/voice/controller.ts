export interface ScribeConnection {
  onPartial(fn: (text: string) => void): void
  onCommitted(fn: (text: string) => void): void
  /** Receives the raw SDK payload; the controller classifies it with isHarmlessScribeError. */
  onError(fn: (error: unknown) => void): void
  onClose(fn: () => void): void
  commit(): void
  close(): void
}

export type ConnectScribe = (opts: { token: string; modelId: string }) => Promise<ScribeConnection>
export type VoiceStatus = 'idle' | 'listening' | 'finishing' | 'unavailable'

export const MIN_WORDS = 2

/**
 * Server or SDK errors that only mean "this press produced nothing usable"
 * (too little audio, commit sent too soon). They cancel the press; they must
 * not disable voice. Anything else (auth, quota, mic denied, socket failure)
 * is treated as fatal. The SDK sends `{ message_type, error }` payloads.
 */
export function isHarmlessScribeError(error: unknown): boolean {
  const parts: string[] = []
  if (typeof error === 'string') parts.push(error)
  else if (error instanceof Error) parts.push(error.message)
  else if (typeof error === 'object' && error !== null) {
    for (const key of ['message_type', 'error', 'message', 'type']) {
      const value = (error as Record<string, unknown>)[key]
      if (typeof value === 'string') parts.push(value)
    }
  }
  return /insufficient[_ ]audio[_ ]activity|commit[_ ]throttled/i.test(parts.join(' '))
}

/** Tokens expire after 15 minutes; discard prefetched ones older than 10. */
const MAX_TOKEN_AGE_MS = 10 * 60 * 1000

type Token = { token: string; modelId: string }
type TokenEntry = { promise: Promise<Token>; at: number }

/**
 * Holds at most one single-use token (or the fetch for one). It outlives any
 * one controller: the tour swaps the floating bar for the inline one at every
 * stop, and a fresh fetch can take several seconds, longer than a typical hold.
 */
export function createTokenCache(getToken: () => Promise<Token>, now: () => number = Date.now) {
  let pending: TokenEntry | null = null
  const track = (entry: TokenEntry) => {
    entry.promise.catch(() => {
      if (pending === entry) pending = null
    })
    return entry
  }
  const fresh = (entry: TokenEntry | null) => entry !== null && now() - entry.at <= MAX_TOKEN_AGE_MS
  return {
    /** Start a fetch unless a usable token (or fetch) is already held. */
    prefetch() {
      if (!fresh(pending)) pending = track({ promise: getToken(), at: now() })
    },
    /** Hand out the held token, or fetch one now. */
    take(): TokenEntry {
      const entry = pending
      pending = null
      return entry && fresh(entry) ? entry : track({ promise: getToken(), at: now() })
    },
    /** Return a token that was never sent to the server, so the next press can use it. */
    restore(entry: TokenEntry) {
      if (!fresh(pending)) pending = entry
    }
  }
}

export type TokenCache = ReturnType<typeof createTokenCache>

export interface VoiceControllerDeps {
  getToken: () => Promise<Token>
  /** Shared token cache; defaults to a private one built from getToken. */
  tokens?: TokenCache
  connect: ConnectScribe
  onPartial: (text: string) => void
  onStatus: (status: VoiceStatus) => void
  /** Called on prefetch to load whatever connect needs (e.g. the SDK chunk) ahead of the first press. */
  warm?: () => void
  finalTimeoutMs?: number
  /** Clock, injectable for tests. */
  now?: () => number
}

/**
 * Push-to-talk over a realtime Scribe session. Press opens a session with a
 * single-use token; release commits, waits briefly for the final transcript,
 * and closes. Harmless failures (no audio, throttled commit) cancel the press;
 * real failures mark the controller unavailable so the UI can switch to a
 * text box.
 */
export function createVoiceController(deps: VoiceControllerDeps) {
  const finalTimeoutMs = deps.finalTimeoutMs ?? 1500
  const tokens = deps.tokens ?? createTokenCache(deps.getToken, deps.now)
  let conn: ScribeConnection | null = null
  let phase: 'idle' | 'listening' | 'finishing' = 'idle'
  let partial = ''
  let committed: string[] = []
  let wake: (() => void) | null = null
  let unavailable = false
  // Press generation: bumped on cancel so a start() resuming from an await can tell it is stale.
  let gen = 0
  let starting: number | null = null
  // The token the pending start() holds, until it is sent to connect().
  let startingToken: TokenEntry | null = null

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

  // A press that produced nothing usable: back to idle, voice stays available.
  // Bumping gen makes a pending stop() resolve null instead of reporting text.
  const cancel = () => {
    gen++
    phase = 'idle'
    closeActive()
    wake?.()
    status('idle')
  }

  return {
    prefetch() {
      if (unavailable) return
      deps.warm?.()
      tokens.prefetch()
    },
    async start() {
      if (starting !== null || conn || unavailable) return
      const mine = ++gen
      starting = mine
      partial = ''
      committed = []
      try {
        const entry = tokens.take()
        startingToken = entry
        const { token, modelId } = await entry.promise
        if (mine !== gen) return
        // From here the token is spent: the server consumes it on connect.
        startingToken = null
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
        next.onError((error) => {
          if (conn !== next) return
          if (isHarmlessScribeError(error)) cancel()
          else fail()
        })
        next.onClose(() => {
          if (conn !== next) return
          if (phase === 'listening') fail()
          else wake?.()
        })
        status('listening')
        tokens.prefetch()
      } catch {
        if (mine === gen) fail()
      } finally {
        if (starting === mine) {
          starting = null
          startingToken = null
        }
      }
    },
    async stop(): Promise<string | null> {
      if (starting !== null) {
        // Released while still connecting: cancel the press, but keep an
        // unspent token (or its fetch) for the next one.
        gen++
        starting = null
        if (startingToken) tokens.restore(startingToken)
        startingToken = null
        return null
      }
      const active = conn
      if (!active || phase !== 'listening') return null
      const mine = gen
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
          // e.g. socket not open: this press is lost, voice is not.
          cancel()
        }
      })
      wake = null
      // dispose() during finishing bumps gen: the controller is gone, report nothing.
      if (unavailable || mine !== gen) return null
      phase = 'idle'
      closeActive()
      status('idle')
      const text = (committed.length > 0 ? committed.join(' ') : partial).trim()
      return text.split(/\s+/).filter(Boolean).length >= MIN_WORDS ? text : null
    },
    dispose() {
      gen++
      starting = null
      if (startingToken) tokens.restore(startingToken)
      startingToken = null
      phase = 'idle'
      closeActive()
      wake?.()
    }
  }
}
