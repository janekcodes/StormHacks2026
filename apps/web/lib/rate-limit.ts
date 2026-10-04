import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Per-session sliding window shared by the guide and speak routes so text
// questions and spoken sentences count against the same session budget
// (BLUEPRINT section 11 and plan 12).
export const RATE_LIMIT = { windowMs: 60_000, max: 24 } as const

// Multi-region safe (Vercel serverless): backed by Upstash Redis when
// configured, with an in-memory fallback for local dev and single-instance
// previews. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let upstash: Ratelimit | null = null
if (redisUrl && redisToken) {
  upstash = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT.max, `${RATE_LIMIT.windowMs} ms`),
    prefix: 'museum.rate'
  })
}

const buckets = new Map<string, number[]>()

function inMemoryRateLimited(sessionId: string): boolean {
  const now = Date.now()
  const bucket = (buckets.get(sessionId) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs)
  if (bucket.length >= RATE_LIMIT.max) {
    buckets.set(sessionId, bucket)
    return true
  }
  bucket.push(now)
  buckets.set(sessionId, bucket)
  return false
}

export async function rateLimited(sessionId: string): Promise<boolean> {
  if (upstash) {
    try {
      const { success } = await upstash.limit(sessionId)
      return !success
    } catch {
      // Fall back to the in-memory limiter if Redis is briefly unreachable.
      return inMemoryRateLimited(sessionId)
    }
  }
  return inMemoryRateLimited(sessionId)
}
