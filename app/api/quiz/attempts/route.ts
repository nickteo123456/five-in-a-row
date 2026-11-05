import { NextRequest, NextResponse } from 'next/server'
import { saveAttempt } from '@/lib/learning'
import { logger } from '@/lib/logger'
import { requireUser } from '@/lib/session'
import { attemptSchema, parseBody } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const body = await parseBody(request, attemptSchema)
    if (body instanceof NextResponse) return body

    const result = await saveAttempt(session.userId, body.questionId, body.answer)

    if (!result) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error saving attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
