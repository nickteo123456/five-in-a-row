import { NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { devStore } from '@/lib/dev-store'
import { findDevUserById } from '@/lib/dev-users'
import { requireUser } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    // In dev mode, use dev users
    if (isDevMode) {
      const devUser = findDevUserById(session.userId)

      if (!devUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Get stats from in-memory store
      const userStats = devStore.stats.get(devUser.id) || {
        total_score: 0,
        highest_score: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
      }

      const accuracy =
        userStats.matches_played > 0
          ? Math.round((userStats.wins / userStats.matches_played) * 100)
          : 0

      // Get match history from in-memory store
      const userMatchHistory = devStore.matchHistory.get(devUser.id) || []

      return NextResponse.json({
        user: {
          id: devUser.id,
          email: devUser.email,
          name: devUser.name,
          role: devUser.role,
          createdAt: devUser.created_at,
        },
        stats: {
          totalMatches: userStats.matches_played,
          totalScore: userStats.total_score,
          highestScore: userStats.highest_score,
          avgScore:
            userStats.matches_played > 0
              ? Math.round(userStats.total_score / userStats.matches_played)
              : 0,
          accuracy,
          wins: userStats.wins,
          totalCorrect: userMatchHistory.reduce((sum, m) => sum + m.correct_answers, 0),
          totalQuestions: userMatchHistory.reduce((sum, m) => sum + m.total_questions, 0),
        },
        matchHistory: userMatchHistory.map((match) => ({
          id: match.id,
          score: match.score || 0,
          correctAnswers: match.correct_answers || 0,
          totalQuestions: match.total_questions || 0,
          gameMode: match.game_mode || 'multiplayer',
          duration: match.duration || 0,
          completedAt: match.completed_at,
          opponentName: match.opponent_name,
          opponentScore: match.opponent_score,
          isWinner: match.is_winner,
        })),
      })
    }

    // Get user from database with stats fields using admin client
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(
        'id, email, name, role, created_at, total_score, highest_score, matches_played, wins, losses'
      )
      .eq('id', session.userId)
      .single()

    if (userError || !userData) {
      logger.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get match history using admin client
    const { data: matches, error: matchError } = await supabaseAdmin
      .from('match_history')
      .select('*')
      .eq('user_id', userData.id)
      .order('completed_at', { ascending: false })
      .limit(50)

    // If match_history table doesn't exist yet, return zero stats
    if (matchError && matchError.code === '42P01') {
      return NextResponse.json({
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          createdAt: userData.created_at,
        },
        stats: {
          totalMatches: 0,
          totalScore: 0,
          highestScore: 0,
          avgScore: 0,
          accuracy: 0,
          wins: 0,
          totalCorrect: 0,
          totalQuestions: 0,
        },
        matchHistory: [],
      })
    }

    // Use stats from users table
    const matchHistory = matches || []
    const totalMatches = userData.matches_played || 0
    const totalScore = userData.total_score || 0
    const highestScore = userData.highest_score || 0
    const avgScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0
    const totalCorrect = matchHistory.reduce((sum, m) => sum + (m.correct_answers || 0), 0)
    const totalQuestions = matchHistory.reduce((sum, m) => sum + (m.total_questions || 0), 0)
    const accuracy = totalMatches > 0 ? Math.round(((userData.wins || 0) / totalMatches) * 100) : 0

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        createdAt: userData.created_at,
      },
      stats: {
        totalMatches,
        totalScore,
        highestScore,
        avgScore,
        accuracy,
        wins: userData.wins || 0,
        totalCorrect,
        totalQuestions,
      },
      matchHistory: matchHistory.map((match) => ({
        id: match.id,
        score: match.score || 0,
        correctAnswers: match.correct_answers || 0,
        totalQuestions: match.total_questions || 0,
        gameMode: match.game_mode || 'multiplayer',
        duration: match.duration || 0,
        completedAt: match.completed_at,
        opponentName: match.opponent_name || 'Unknown',
        opponentScore: match.opponent_score || 0,
        isWinner: match.is_winner || false,
      })),
    })
  } catch (error) {
    logger.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
