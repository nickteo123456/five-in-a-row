import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from './supabase'
import { devStore } from './dev-store'
import { logger } from './logger'

const MINUTE = 60
const HOUR = 60 * MINUTE

// A whole class can share one school IP, so the per-IP limits are generous and
// the per-account limit does most of the work against password guessing.
export const RATE_LIMITS = {
  loginAccount: { limit: 10, windowSeconds: 15 * MINUTE },
  loginIp: { limit: 100, windowSeconds: 15 * MINUTE },
  registerIp: { limit: 30, windowSeconds: HOUR },
  passwordResetIp: { limit: 10, windowSeconds: HOUR },
}

type RateLimit = (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS]

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

// Counts this attempt and returns whether it is within the limit.
async function consumeAttempt(key: string, { limit, windowSeconds }: RateLimit): Promise<boolean> {
  if (isDevMode) {
    const now = Date.now()
    const entry = devStore.rateLimits.get(key)

    if (!entry || entry.resetAt < now) {
      devStore.rateLimits.set(key, { attempts: 1, resetAt: now + windowSeconds * 1000 })
      return true
    }

    entry.attempts += 1
    return entry.attempts <= limit
  }

  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  // A broken limiter must not lock everyone out of the site
  if (error) {
    logger.error('Error checking rate limit:', error)
    return true
  }

  return data === true
}

// Returns the 429 response to send when any limit is exceeded, otherwise null.
export async function enforceRateLimits(
  checks: { key: string; rule: RateLimit }[]
): Promise<NextResponse | null> {
  const results = await Promise.all(checks.map(({ key, rule }) => consumeAttempt(key, rule)))

  if (results.every(Boolean)) return null

  return NextResponse.json(
    { error: 'Too many attempts. Please wait a few minutes and try again.' },
    { status: 429 }
  )
}
