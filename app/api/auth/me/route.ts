import { NextResponse } from 'next/server'
import { findUserById } from '@/lib/database'
import { clearSessionCookie, requireUser } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const user = await findUserById(session.userId)

    // The account was deleted after this session was issued
    if (!user) {
      const response = NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      clearSessionCookie(response)
      return response
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (error) {
    logger.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
