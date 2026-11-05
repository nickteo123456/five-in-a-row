import { NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { getAllDevUsers } from '@/lib/dev-users'
import { devStore } from '@/lib/dev-store'
import { logger } from '@/lib/logger'
import { requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

const LEADERBOARD_SIZE = 20

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    if (isDevMode) {
      const players = getAllDevUsers()
        .filter((user) => user.role === 'student')
        .map((user) => ({ id: user.id, name: user.name, ...devStore.stats.get(user.id) }))
        .filter((player) => player.matches_played)
        .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
        .slice(0, LEADERBOARD_SIZE)

      return NextResponse.json({ players })
    }

    // Only names and game stats: other students' emails stay private
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, total_score, highest_score, matches_played, wins')
      .eq('role', 'student')
      .gt('matches_played', 0)
      .order('total_score', { ascending: false })
      .limit(LEADERBOARD_SIZE)

    if (error) throw error

    return NextResponse.json({ players: data })
  } catch (error) {
    logger.error('Error loading leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
