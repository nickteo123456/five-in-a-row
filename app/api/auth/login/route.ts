import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth'
import { findUserWithPasswordByEmail } from '@/lib/database'
import { RATE_LIMITS, enforceRateLimits, getClientIp } from '@/lib/rate-limit'
import { setSessionCookie } from '@/lib/session'
import type { Role } from '@/lib/roles'
import { loginSchema, parseBody } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, loginSchema)
    if (body instanceof NextResponse) return body

    const ip = getClientIp(request)
    const limited = await enforceRateLimits([
      { key: `login:${ip}:${body.email.toLowerCase()}`, rule: RATE_LIMITS.loginAccount },
      { key: `login:${ip}`, rule: RATE_LIMITS.loginIp },
    ])
    if (limited) return limited

    const user = await findUserWithPasswordByEmail(body.email)

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValidPassword = await verifyPassword(body.password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
    await setSessionCookie(response, { userId: user.id, role: user.role as Role })

    return response
  } catch (error) {
    logger.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
