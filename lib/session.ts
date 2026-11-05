import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Role } from './roles'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  type Session,
} from './session-token'

export type { Session }

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()

  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
}

// Both helpers return the session, or the error response the route should send.
export async function requireUser(): Promise<Session | NextResponse> {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 })
  }

  return session
}

export async function requireRole(role: Role): Promise<Session | NextResponse> {
  const session = await requireUser()

  if (session instanceof NextResponse) return session

  if (session.role !== role) {
    return NextResponse.json({ error: 'You do not have access to this resource' }, { status: 403 })
  }

  return session
}

export async function setSessionCookie(response: NextResponse, session: Session): Promise<void> {
  response.cookies.set(SESSION_COOKIE, await createSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
