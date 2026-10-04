import { requestListenToken } from '../../../lib/listen-token'
import { rateLimited } from '../../../lib/rate-limit'

// Server-only: holds ELEVENLABS_API_KEY. Shares the guide's per-session budget.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get('sessionId') ?? ''
  if (!sessionId || sessionId.length > 128) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (await rateLimited(sessionId)) {
    return Response.json(
      { error: 'You have asked a lot of questions. Wait a moment and try again.' },
      { status: 429 }
    )
  }
  const out = await requestListenToken(
    { ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY, LISTEN_MODEL: process.env.LISTEN_MODEL },
    fetch
  )
  return Response.json(out.body, { status: out.status, headers: { 'Cache-Control': 'no-store' } })
}
