import { describe, expect, it } from 'vitest'
import { createEmptyBoard } from '@/lib/game/board'
import {
  attemptSchema,
  joinLobbySchema,
  lobbyUpdateSchema,
  loginSchema,
  parseBody,
  questionQuerySchema,
  questionSchema,
  registerSchema,
} from '@/lib/validation'
import { NextResponse } from 'next/server'

const validQuestion = {
  question: 'Q',
  option_a: 'a',
  option_b: 'b',
  option_c: 'c',
  option_d: 'd',
  correct_answer: 1,
  explanation: 'E',
  topic: 'Loops',
}

describe('registerSchema', () => {
  const valid = { email: 'a@example.com', password: 'secret12', name: 'Ann' }

  it('accepts valid input', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['a bad email', { email: 'nope' }],
    ['a short password', { password: '123' }],
    ['a blank name', { name: '   ' }],
  ])('rejects %s', (_, change) => {
    expect(registerSchema.safeParse({ ...valid, ...change }).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('requires both fields', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com' }).success).toBe(false)
  })
})

describe('questionSchema', () => {
  it('defaults the difficulty', () => {
    expect(questionSchema.parse(validQuestion).difficulty).toBe('beginner')
  })

  it('rejects an answer outside the four options', () => {
    expect(questionSchema.safeParse({ ...validQuestion, correct_answer: 4 }).success).toBe(false)
  })

  it('drops fields the client may not set', () => {
    expect(questionSchema.parse({ ...validQuestion, created_by: 'x' })).not.toHaveProperty(
      'created_by'
    )
  })
})

describe('questionQuerySchema', () => {
  it('parses the count', () => {
    expect(questionQuerySchema.parse({ count: '50' }).count).toBe(50)
  })

  it('rejects an invalid count', () => {
    expect(questionQuerySchema.safeParse({ count: 'abc' }).success).toBe(false)
  })
})

describe('joinLobbySchema', () => {
  it('needs exactly five digits', () => {
    expect(joinLobbySchema.safeParse({ lobbyCode: '12345' }).success).toBe(true)
    expect(joinLobbySchema.safeParse({ lobbyCode: 'ABCDE' }).success).toBe(false)
    expect(joinLobbySchema.safeParse({ lobbyCode: '1234' }).success).toBe(false)
  })
})

describe('lobbyUpdateSchema', () => {
  it('accepts a move', () => {
    const update = { board_state: createEmptyBoard(), current_turn: 'O', host_can_place: false }
    expect(lobbyUpdateSchema.safeParse(update).success).toBe(true)
  })

  it.each(['host_user_id', 'guest_user_id', 'lobby_code', 'started_at'])(
    'refuses to change %s',
    (field) => {
      expect(lobbyUpdateSchema.safeParse({ [field]: 'x' }).success).toBe(false)
    }
  )

  it('rejects a malformed board', () => {
    expect(lobbyUpdateSchema.safeParse({ board_state: [[1]] }).success).toBe(false)
  })

  it('only allows the statuses clients use', () => {
    expect(lobbyUpdateSchema.safeParse({ status: 'waiting' }).success).toBe(false)
  })
})

describe('attemptSchema', () => {
  it('accepts numbers and strings', () => {
    expect(attemptSchema.safeParse({ questionId: 'q', answer: 1 }).success).toBe(true)
    expect(attemptSchema.safeParse({ questionId: 'q', answer: 'x' }).success).toBe(true)
  })
})

describe('parseBody', () => {
  const post = (body: string) => new Request('http://test', { method: 'POST', body })

  it('returns the data', async () => {
    expect(await parseBody(post('{"lobbyCode":"12345"}'), joinLobbySchema)).toEqual({
      lobbyCode: '12345',
    })
  })

  it('answers 400 for invalid JSON', async () => {
    const result = await parseBody(post('{oops'), joinLobbySchema)

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(400)
  })
})
