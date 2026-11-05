import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { resetPassword } from '@/lib/password-reset'
import { RATE_LIMITS, enforceRateLimits, getClientIp } from '@/lib/rate-limit'
import { parseBody, resetPasswordSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, resetPasswordSchema)
    if (body instanceof NextResponse) return body

    const limited = await enforceRateLimits([
      { key: `reset:${getClientIp(request)}`, rule: RATE_LIMITS.passwordResetIp },
    ])
    if (limited) return limited

    const isReset = await resetPassword(body.token, await hashPassword(body.password))

    if (!isReset) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired' },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: 'Password updated' })
  } catch (error) {
    logger.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
