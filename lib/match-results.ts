import { supabaseAdmin, isDevMode } from './supabase'
import { devStore } from './dev-store'
import type { Lobby } from './lobbies'
import { logger } from './logger'

export interface PlayerStats {
  total_score: number
  highest_score: number
  matches_played: number
  wins: number
  losses: number
}

export interface MatchRecord {
  id: string
  user_id: string
  score: number
  game_mode: string
  opponent_name: string
  opponent_score: number
  is_winner: boolean
  duration: number
  correct_answers: number
  total_questions: number
  completed_at: string
}

const EMPTY_STATS: PlayerStats = {
  total_score: 0,
  highest_score: 0,
  matches_played: 0,
  wins: 0,
  losses: 0,
}

function addMatchToStats(stats: PlayerStats, score: number, isWinner: boolean): PlayerStats {
  return {
    total_score: stats.total_score + score,
    highest_score: Math.max(stats.highest_score, score),
    matches_played: stats.matches_played + 1,
    wins: stats.wins + (isWinner ? 1 : 0),
    losses: stats.losses + (isWinner ? 0 : 1),
  }
}

function buildMatchRecords(lobby: Lobby): Omit<MatchRecord, 'id'>[] {
  if (!lobby.guest_user_id) return []

  const completedAt = new Date().toISOString()
  const duration = lobby.started_at
    ? Math.round((Date.now() - new Date(lobby.started_at).getTime()) / 1000)
    : 0
  const players = [
    {
      userId: lobby.host_user_id,
      score: lobby.host_score,
      opponentName: lobby.guest_name,
      opponentScore: lobby.guest_score,
      answered: lobby.host_answered,
      correct: lobby.host_correct,
    },
    {
      userId: lobby.guest_user_id,
      score: lobby.guest_score,
      opponentName: lobby.host_name,
      opponentScore: lobby.host_score,
      answered: lobby.guest_answered,
      correct: lobby.guest_correct,
    },
  ]

  return players.map((player) => ({
    user_id: player.userId,
    score: player.score || 0,
    game_mode: 'online',
    opponent_name: player.opponentName || 'Unknown',
    opponent_score: player.opponentScore || 0,
    is_winner: lobby.winner_id === player.userId,
    duration,
    correct_answers: player.correct || 0,
    total_questions: player.answered || 0,
    completed_at: completedAt,
  }))
}

async function saveMatchRecord(record: Omit<MatchRecord, 'id'>): Promise<void> {
  if (isDevMode) {
    const stats = devStore.stats.get(record.user_id) || EMPTY_STATS
    const history = devStore.matchHistory.get(record.user_id) || []

    devStore.stats.set(record.user_id, addMatchToStats(stats, record.score, record.is_winner))
    devStore.matchHistory.set(record.user_id, [{ id: crypto.randomUUID(), ...record }, ...history])
    return
  }

  const { data: currentStats } = await supabaseAdmin
    .from('users')
    .select('total_score, highest_score, matches_played, wins, losses')
    .eq('id', record.user_id)
    .single()

  const { error: statsError } = await supabaseAdmin
    .from('users')
    .update(addMatchToStats({ ...EMPTY_STATS, ...currentStats }, record.score, record.is_winner))
    .eq('id', record.user_id)

  if (statsError) {
    logger.error('Error updating user stats:', statsError)
  }

  const { error: historyError } = await supabaseAdmin.from('match_history').insert(record)

  if (historyError) {
    logger.error('Error saving match history:', historyError)
  }
}

// Failing to save a result must not fail the move that ended the game.
export async function recordMatchResult(lobby: Lobby): Promise<void> {
  try {
    await Promise.all(buildMatchRecords(lobby).map(saveMatchRecord))
  } catch (error) {
    logger.error('Error recording match result:', error)
  }
}
