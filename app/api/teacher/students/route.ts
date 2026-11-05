import { NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { getAllDevUsers } from '@/lib/dev-users'
import { requireRole } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    // In dev mode, return dev users
    if (isDevMode) {
      const users = getAllDevUsers()
      const students = users
        .filter((u) => u.role === 'student')
        .map((student) => ({
          user_id: student.id,
          name: student.name,
          email: student.email,
          created_at: student.created_at,
          total_matches: 0,
          highest_score: 0,
          average_score: 0,
          total_correct: 0,
          total_questions_attempted: 0,
          overall_accuracy: 0,
          last_activity: null,
        }))

      return NextResponse.json({ students })
    }

    // Get all students from users table with their stats using admin client (bypasses RLS)
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select(
        'id, name, email, created_at, total_score, highest_score, matches_played, wins, losses'
      )
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (usersError) {
      logger.error('[Teacher Students API] Error fetching students with stats:', usersError)

      // If columns don't exist, try fetching without stats columns
      const { data: basicUsersData, error: basicError } = await supabaseAdmin
        .from('users')
        .select('id, name, email, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })

      if (basicError) {
        logger.error('[Teacher Students API] Error fetching basic student data:', basicError)
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
      }

      // Return students with zero stats
      const students = (basicUsersData || []).map((user) => ({
        user_id: user.id,
        name: user.name,
        email: user.email,
        total_matches: 0,
        highest_score: 0,
        average_score: 0,
        total_correct: 0,
        total_questions_attempted: 0,
        overall_accuracy: 0,
        last_activity: null,
        created_at: user.created_at,
      }))

      return NextResponse.json({
        students,
        warning: 'Stats columns not found. Please run add-user-stats-columns.sql migration.',
      })
    }

    if (!usersData || usersData.length === 0) {
      return NextResponse.json({ students: [] })
    }

    // Map students data directly from users table (no match_history needed)
    const students = usersData.map((user) => {
      const totalMatches = user.matches_played || 0
      const highestScore = user.highest_score || 0
      const totalScore = user.total_score || 0
      const averageScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0
      const wins = user.wins || 0
      const losses = user.losses || 0
      const totalGames = wins + losses
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

      return {
        user_id: user.id,
        name: user.name,
        email: user.email,
        total_matches: totalMatches,
        highest_score: highestScore,
        average_score: averageScore,
        total_correct: 0,
        total_questions_attempted: 0,
        overall_accuracy: winRate,
        last_activity: null,
        created_at: user.created_at,
      }
    })

    // Sort by highest score descending
    students.sort((a, b) => b.highest_score - a.highest_score)

    return NextResponse.json({ students })
  } catch (error) {
    logger.error('[Teacher Students API] Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
