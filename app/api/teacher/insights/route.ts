import { NextResponse } from 'next/server'
import { findHardestQuestions, listAttempts, summarizeTopics } from '@/lib/learning'
import { logger } from '@/lib/logger'
import { requireRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    const attempts = await listAttempts()

    return NextResponse.json({
      topics: summarizeTopics(attempts),
      hardestQuestions: findHardestQuestions(attempts),
      totalAttempts: attempts.length,
    })
  } catch (error) {
    logger.error('Error loading class insights:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
