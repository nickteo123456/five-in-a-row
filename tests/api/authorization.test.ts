import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE as deleteStudent } from '@/app/api/teacher/students/[id]/route'
import { GET as listStudents } from '@/app/api/teacher/students/route'
import { GET as teacherHistory } from '@/app/api/teacher/match-history/route'
import { GET as insights } from '@/app/api/teacher/insights/route'
import { GET as studentStats } from '@/app/api/student/stats/route'
import { GET as leaderboard } from '@/app/api/leaderboard/route'
import { POST as createLobby } from '@/app/api/lobby/create/route'
import { POST as joinLobby } from '@/app/api/lobby/join/route'
import { PATCH as updateLobby } from '@/app/api/lobby/[lobbyId]/route'
import { POST as createQuestion } from '@/app/api/questions/route'
import { GET as listQuestions } from '@/app/api/questions/route'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as register } from '@/app/api/auth/register/route'
import { createDevUser } from '@/lib/dev-users'
import { devStore } from '@/lib/dev-store'
import { SESSION_COOKIE, createSessionToken } from '@/lib/session-token'

let cookie: string | undefined

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === SESSION_COOKIE && cookie ? { value: cookie } : undefined),
  }),
}))

const signIn = async (userId: string, role: 'teacher' | 'student') => {
  cookie = await createSessionToken({ userId, role })
}

const json = (body: unknown) =>
  new NextRequest('http://test/api', { method: 'POST', body: JSON.stringify(body) })

const params = <T>(value: T) => ({ params: Promise.resolve(value) })

const teacherRoutes = [
  ['GET /api/teacher/students', () => listStudents()],
  ['GET /api/teacher/match-history', () => teacherHistory()],
  ['GET /api/teacher/insights', () => insights()],
  ['DELETE /api/teacher/students/[id]', () => deleteStudent(json({}), params({ id: 'x' }))],
  ['POST /api/questions', () => createQuestion(json({}))],
] as const

beforeEach(() => {
  cookie = undefined
  devStore.lobbies.clear()
  devStore.rateLimits.clear()
})

describe('teacher routes', () => {
  it.each(teacherRoutes)('%s answers 401 without a session', async (_, call) => {
    expect((await call()).status).toBe(401)
  })

  it.each(teacherRoutes)('%s answers 403 for a student', async (_, call) => {
    await signIn('student-1', 'student')
    expect((await call()).status).toBe(403)
  })

  it('lets a teacher in', async () => {
    await signIn('teacher-1', 'teacher')
    expect((await listStudents()).status).toBe(200)
  })

  it('never returns password hashes', async () => {
    createDevUser('hash@example.com', 'Hash', 'secret-hash')
    await signIn('teacher-1', 'teacher')

    expect(await (await listStudents()).text()).not.toContain('secret-hash')
  })
})

describe('own data', () => {
  it('requires a session', async () => {
    expect((await studentStats()).status).toBe(401)
    expect((await leaderboard()).status).toBe(401)
  })

  it('reads the logged-in user from the session', async () => {
    const user = createDevUser('own@example.com', 'Own', 'hash')
    await signIn(user.id, 'student')

    const body = await (await studentStats()).json()

    expect(body.user.email).toBe('own@example.com')
  })
})

describe('guests', () => {
  it('can load questions without a session', async () => {
    const response = await listQuestions(new NextRequest('http://test/api/questions'))
    expect(response.status).toBe(200)
  })

  it('cannot use lobbies', async () => {
    expect((await createLobby()).status).toBe(401)
  })
})

describe('lobbies', () => {
  const setup = async () => {
    const host = createDevUser(`${crypto.randomUUID()}@example.com`, 'Host', 'hash')
    const guest = createDevUser(`${crypto.randomUUID()}@example.com`, 'Guest', 'hash')
    const stranger = createDevUser(`${crypto.randomUUID()}@example.com`, 'Stranger', 'hash')

    await signIn(host.id, 'student')
    const { lobby } = await (await createLobby()).json()

    await signIn(guest.id, 'student')
    await joinLobby(json({ lobbyCode: lobby.lobby_code }))

    return { host, guest, stranger, lobby }
  }

  const patch = (lobbyId: string, body: unknown) =>
    updateLobby(new NextRequest('http://test', { method: 'PATCH', body: JSON.stringify(body) }), {
      params: Promise.resolve({ lobbyId }),
    })

  it('rejects players outside the lobby', async () => {
    const { stranger, lobby } = await setup()
    await signIn(stranger.id, 'student')

    expect((await patch(lobby.id, { host_score: 99 })).status).toBe(403)
  })

  it('refuses to change who is in the lobby', async () => {
    const { host, stranger, lobby } = await setup()
    await signIn(host.id, 'student')

    expect((await patch(lobby.id, { guest_user_id: stranger.id })).status).toBe(400)
  })

  it('only accepts a winner who is in the lobby', async () => {
    const { host, stranger, lobby } = await setup()
    await signIn(host.id, 'student')

    expect((await patch(lobby.id, { winner_id: stranger.id })).status).toBe(400)
  })

  it('records a finished game once for each player', async () => {
    const { host, guest, lobby } = await setup()
    await signIn(host.id, 'student')

    await patch(lobby.id, { status: 'active' })
    await patch(lobby.id, { status: 'completed', winner_id: host.id })
    await patch(lobby.id, { status: 'completed', winner_id: host.id })

    expect(devStore.stats.get(host.id)).toMatchObject({ matches_played: 1, wins: 1 })
    expect(devStore.stats.get(guest.id)).toMatchObject({ matches_played: 1, losses: 1 })
  })

  it('lets a player who is already in the lobby reconnect', async () => {
    const { host, lobby } = await setup()
    await signIn(host.id, 'student')

    const response = await joinLobby(json({ lobbyCode: lobby.lobby_code }))

    expect(response.status).toBe(200)
  })
})

describe('authentication', () => {
  it('always registers students, even with the teacher email', async () => {
    devStore.users.delete('teacher@example.com')

    const response = await register(
      json({ email: 'teacher@example.com', password: 'secret12', name: 'Fake' })
    )

    expect((await response.json()).user.role).toBe('student')
    devStore.users.delete('teacher@example.com')
  })

  it('sets the session cookie on login', async () => {
    await register(json({ email: 'cookie@example.com', password: 'secret12', name: 'C' }))

    const response = await login(json({ email: 'cookie@example.com', password: 'secret12' }))

    expect(response.cookies.get(SESSION_COOKIE)?.value).toBeTruthy()
  })

  it('locks out repeated guessing', async () => {
    await register(json({ email: 'guess@example.com', password: 'secret12', name: 'G' }))

    const attempt = () => login(json({ email: 'guess@example.com', password: 'wrong-pass' }))

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).status).toBe(401)
    }

    expect((await attempt()).status).toBe(429)
  })
})
