import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { createUser, findUserWithPasswordByEmail } from '@/lib/database'
import { RATE_LIMITS, enforceRateLimits, getClientIp } from '@/lib/rate-limit'
import { setSessionCookie } from '@/lib/session'
import type { Role } from '@/lib/roles'
import { parseBody, registerSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, registerSchema)
    if (body instanceof NextResponse) return body

    const limited = await enforceRateLimits([
      { key: `register:${getClientIp(request)}`, rule: RATE_LIMITS.registerIp },
    ])
    if (limited) return limited

    const { email, password, name } = body

    // Check if user already exists
    const existingUser = await findUserWithPasswordByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 })
    }

    // Create user in database
    const hashedPassword = await hashPassword(password)
    const user = await createUser(email, name, hashedPassword)

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
    await setSessionCookie(response, { userId: user.id, role: user.role as Role })

    return response
  } catch (error) {
    logger.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
