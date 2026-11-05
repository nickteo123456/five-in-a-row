import { NextResponse } from 'next/server'
import { z } from 'zod'

const BOARD_SIZE = 15
const MAX_NAME_LENGTH = 255
const MAX_PASSWORD_LENGTH = 128

export const registerSchema = z.object({
  email: z.string().trim().max(MAX_NAME_LENGTH).email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(MAX_PASSWORD_LENGTH, 'Password is too long'),
  name: z.string().trim().min(1, 'Name is required').max(MAX_NAME_LENGTH),
})

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').max(MAX_NAME_LENGTH),
  password: z.string().min(1, 'Password is required').max(MAX_PASSWORD_LENGTH),
})

export const questionSchema = z.object({
  question: z.string().trim().min(1, 'Question is required'),
  option_a: z.string().trim().min(1, 'All options are required'),
  option_b: z.string().trim().min(1, 'All options are required'),
  option_c: z.string().trim().min(1, 'All options are required'),
  option_d: z.string().trim().min(1, 'All options are required'),
  correct_answer: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1, 'Explanation is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  topic: z.string().trim().min(1, 'Topic is required').max(100),
})

export const questionUpdateSchema = z.object({
  question: z.string().trim().min(1).optional(),
  option_a: z.string().trim().min(1).optional(),
  option_b: z.string().trim().min(1).optional(),
  option_c: z.string().trim().min(1).optional(),
  option_d: z.string().trim().min(1).optional(),
  correct_answer: z.number().int().min(0).max(3).optional(),
  explanation: z.string().trim().min(1).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  topic: z.string().trim().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
})

export const questionQuerySchema = z.object({
  count: z.coerce.number().int().min(1).max(200).optional(),
  random: z.enum(['true', 'false']).optional(),
})

export const attemptSchema = z.object({
  questionId: z.string().min(1).max(100),
  answer: z.union([z.number().int(), z.string().max(1000)]),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').max(MAX_NAME_LENGTH),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(MAX_PASSWORD_LENGTH, 'Password is too long'),
})

export const lobbyCodeSchema = z.string().regex(/^\d{5}$/, 'Lobby code must be 5 digits')

export const joinLobbySchema = z.object({
  lobbyCode: z.string().trim().pipe(lobbyCodeSchema),
})

const boardCell = z.enum(['X', 'O']).nullable()
const boardRow = z.array(boardCell).length(BOARD_SIZE)

// The only lobby fields a client may change. Unknown fields are rejected, so
// players, the lobby code and timestamps can't be rewritten through this route.
export const lobbyUpdateSchema = z.strictObject({
  board_state: z.array(boardRow).length(BOARD_SIZE).optional(),
  current_turn: z.enum(['X', 'O']).optional(),
  current_question_index: z.number().int().min(0).optional(),
  host_score: z.number().int().optional(),
  guest_score: z.number().int().optional(),
  host_can_place: z.boolean().optional(),
  guest_can_place: z.boolean().optional(),
  host_answered: z.number().int().min(0).optional(),
  host_correct: z.number().int().min(0).optional(),
  guest_answered: z.number().int().min(0).optional(),
  guest_correct: z.number().int().min(0).optional(),
  status: z.enum(['active', 'completed']).optional(),
  winner_id: z.string().max(MAX_NAME_LENGTH).nullable().optional(),
  play_again_request: z.string().max(MAX_NAME_LENGTH).nullable().optional(),
  play_again_requester_name: z.string().max(MAX_NAME_LENGTH).nullable().optional(),
  play_again_accepted: z.boolean().optional(),
  play_again_rejected: z.boolean().optional(),
  play_again_rejecter_name: z.string().max(MAX_NAME_LENGTH).nullable().optional(),
})

export type LobbyUpdate = z.infer<typeof lobbyUpdateSchema>

// Returns the parsed body, or the 400 response the route should send.
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  const body = await request.json().catch(() => undefined)
  const result = schema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    )
  }

  return result.data
}
