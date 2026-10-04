import { z } from 'zod'
import { rateLimited } from '../../../lib/rate-limit'

// The speak route is dynamic and server-only (holds ELEVENLABS_API_KEY).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Streaming TTS plus upstream latency can exceed the Vercel default.
export const maxDuration = 60

const requestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  text: z.string().min(1).max(500)
})

const OUTPUT_FORMAT = 'mp3_44100_96'
// Highest latency optimization (0 to 4): trades a little quality for speed.
const OPTIMIZE_STREAMING_LATENCY = '4'

/**
 * Speak one sentence in the museum voice, streaming audio back. The key and the
 * model ID never reach the browser; the model is read from config (BLUEPRINT
 * section 0 rule 10, section 12). Shares the guide's per-session rate limit.
 */
export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const model = process.env.SPEECH_MODEL

  if (!apiKey || !voiceId || !model) {
    return Response.json(
      {
        error:
          'Guide speech is not configured yet. Set ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID and SPEECH_MODEL on the server.'
      },
      { status: 503 }
    )
  }

  let body: z.infer<typeof requestSchema>
  try {
    body = requestSchema.parse(await request.json())
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (await rateLimited(body.sessionId)) {
    return Response.json(
      { error: 'You have asked a lot of questions. Wait a moment and try again.' },
      { status: 429 }
    )
  }

  const text = body.text.trim()
  if (!text) return Response.json({ error: 'Invalid request.' }, { status: 400 })

  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream` +
    `?output_format=${encodeURIComponent(OUTPUT_FORMAT)}` +
    `&optimize_streaming_latency=${OPTIMIZE_STREAMING_LATENCY}`

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, model_id: model })
  })

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    console.error('speak upstream failed:', upstream.status, detail)
    return Response.json(
      { error: 'Speech is unavailable right now. Please try again.' },
      { status: 502 }
    )
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'no-store'
    }
  })
}
