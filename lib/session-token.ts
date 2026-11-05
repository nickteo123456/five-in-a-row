// Signing and verifying session tokens. Kept free of next/headers so that
// proxy.ts can use it too.
import { SignJWT, jwtVerify } from 'jose'
import type { Role } from './roles'

export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const MIN_SECRET_LENGTH = 32
const DEVELOPMENT_SECRET = 'development-only-session-secret-not-for-production'

export interface Session {
  userId: string
  role: Role
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET

  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < MIN_SECRET_LENGTH)) {
    throw new Error(`SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`)
  }

  return new TextEncoder().encode(secret || DEVELOPMENT_SECRET)
}

export async function createSessionToken({ userId, role }: Session): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })

    if (!payload.sub || (payload.role !== 'teacher' && payload.role !== 'student')) {
      return null
    }

    return { userId: payload.sub, role: payload.role }
  } catch {
    return null
  }
}
