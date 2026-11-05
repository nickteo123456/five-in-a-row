import { NextResponse } from 'next/server'
import { findQuestionsToReview, listAttempts, summarizeTopics } from '@/lib/learning'
import { logger } from '@/lib/logger'
import { requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const attempts = await listAttempts(session.userId)

    return NextResponse.json({
      topics: summarizeTopics(attempts),
      reviewQuestions: findQuestionsToReview(attempts),
      totalAttempts: attempts.length,
      totalCorrect: attempts.filter((attempt) => attempt.is_correct).length,
    })
  } catch (error) {
    logger.error('Error loading learning data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
