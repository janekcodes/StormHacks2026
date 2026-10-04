export interface ListenTokenEnv {
  ELEVENLABS_API_KEY?: string | undefined
  LISTEN_MODEL?: string | undefined
}

export type ListenTokenResult =
  | { status: 200; body: { token: string; modelId: string } }
  | { status: 502 | 503; body: { error: string } }

const TOKEN_URL = 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe'

/**
 * Mint a single-use realtime Scribe token (expires after 15 minutes, consumed
 * on use). The key stays on the server; the browser only sees the token and
 * the model ID from config (BLUEPRINT section 0 rules 8 and 10).
 */
export async function requestListenToken(env: ListenTokenEnv, fetchImpl: typeof fetch): Promise<ListenTokenResult> {
  const apiKey = env.ELEVENLABS_API_KEY
  const modelId = env.LISTEN_MODEL
  if (!apiKey || !modelId) {
    return {
      status: 503,
      body: { error: 'Voice questions are not configured yet. Set ELEVENLABS_API_KEY and LISTEN_MODEL on the server.' }
    }
  }
  try {
    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return { status: 502, body: { error: 'Voice questions are unavailable right now.' } }
    const data = (await res.json()) as { token?: unknown }
    if (typeof data.token !== 'string' || !data.token) {
      return { status: 502, body: { error: 'Voice questions are unavailable right now.' } }
    }
    return { status: 200, body: { token: data.token, modelId } }
  } catch {
    return { status: 502, body: { error: 'Voice questions are unavailable right now.' } }
  }
}
