import { SignJWT } from 'jose'
import { NextResponse } from 'next/server'
import { describe, expect, it } from 'vitest'
import { clearSessionCookie, setSessionCookie } from '@/lib/session'
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from '@/lib/session-token'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
const session = { userId: 'user-1', role: 'student' as const }

const signed = (role: string, expiry: string, key = secret) =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setExpirationTime(expiry)
    .sign(key)

describe('verifySessionToken', () => {
  it('accepts a valid token', async () => {
    expect(await verifySessionToken(await createSessionToken(session))).toEqual(session)
  })

  it('rejects a missing token', async () => {
    expect(await verifySessionToken(undefined)).toBeNull()
  })

  it('rejects an expired token', async () => {
    expect(await verifySessionToken(await signed('student', '-1h'))).toBeNull()
  })

  it('rejects a token signed with another key', async () => {
    const otherKey = new TextEncoder().encode('x'.repeat(40))
    expect(await verifySessionToken(await signed('teacher', '1h', otherKey))).toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const [header, payload, signature] = (await createSessionToken(session)).split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'teacher' })).toString('base64url')

    expect(await verifySessionToken(`${header}.${forged}.${signature}`)).toBeNull()
  })

  it('rejects an unsigned token', async () => {
    const header = Buffer.from('{"alg":"none"}').toString('base64url')
    const payload = Buffer.from('{"sub":"x","role":"teacher"}').toString('base64url')

    expect(await verifySessionToken(`${header}.${payload}.`)).toBeNull()
  })

  it('rejects an unknown role', async () => {
    expect(await verifySessionToken(await signed('admin', '1h'))).toBeNull()
  })
})

describe('session cookie', () => {
  it('is httpOnly and same-site', async () => {
    const response = NextResponse.json({})
    await setSessionCookie(response, session)
    const cookie = response.cookies.get(SESSION_COOKIE)

    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.maxAge).toBe(604800)
  })

  it('is cleared on logout', () => {
    const response = NextResponse.json({})
    clearSessionCookie(response)

    expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0)
  })
})
