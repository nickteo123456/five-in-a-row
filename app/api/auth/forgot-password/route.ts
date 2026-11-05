import { NextRequest, NextResponse } from 'next/server'
import { findUserWithPasswordByEmail } from '@/lib/database'
import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { createResetToken } from '@/lib/password-reset'
import { RATE_LIMITS, enforceRateLimits, getClientIp } from '@/lib/rate-limit'
import { isDevMode } from '@/lib/supabase'
import { forgotPasswordSchema, parseBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, forgotPasswordSchema)
    if (body instanceof NextResponse) return body

    const limited = await enforceRateLimits([
      { key: `forgot:${getClientIp(request)}`, rule: RATE_LIMITS.passwordResetIp },
    ])
    if (limited) return limited

    const user = await findUserWithPasswordByEmail(body.email)

    if (user) {
      const token = await createResetToken(user.id)
      const appUrl = process.env.APP_URL || request.nextUrl.origin
      const link = `${appUrl}/reset-password?token=${token}`

      if (isDevMode) {
        console.info(`Password reset link (dev mode): ${link}`)
      } else {
        await sendEmail(
          user.email,
          'Reset your Connect Five password',
          `<p>Use this link to choose a new password. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you didn't ask for this, you can ignore this email.</p>`
        )
      }
    }

    // Same answer either way, so this can't reveal who has an account
    return NextResponse.json({ message: 'If that account exists, a reset link is on its way' })
  } catch (error) {
    logger.error('Error requesting password reset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
