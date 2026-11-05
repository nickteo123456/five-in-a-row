import { NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { requireRole } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    // In dev mode, return empty history
    if (isDevMode) {
      return NextResponse.json({ matches: [] })
    }

    const { data: matches, error: matchError } = await supabaseAdmin
      .from('match_history')
      .select('*, user:users(name, email)')
      .order('completed_at', { ascending: false })
      .limit(100)

    // If match_history table doesn't exist yet, return empty array
    if (matchError) {
      return NextResponse.json({ matches: [] })
    }

    const matchesWithStudents = (matches || []).map((match) => ({
      id: match.id,
      user_id: match.user_id,
      student_name: match.user?.name || 'Unknown',
      student_email: match.user?.email || 'N/A',
      score: match.score,
      correct_answers: match.correct_answers,
      total_questions: match.total_questions,
      game_mode: match.game_mode,
      duration: match.duration,
      completed_at: match.completed_at,
      opponent_name: match.opponent_name || 'Unknown',
      opponent_score: match.opponent_score || 0,
      is_winner: match.is_winner || false,
    }))

    return NextResponse.json({ matches: matchesWithStudents })
  } catch (error) {
    logger.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
