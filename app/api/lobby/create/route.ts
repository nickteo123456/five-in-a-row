import { NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { findUserById } from '@/lib/database'
import { devStore } from '@/lib/dev-store'
import { requireUser } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function generateLobbyCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString()
}

export async function POST() {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const user = await findUserById(session.userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Development mode
    if (isDevMode) {
      let lobbyCode = generateLobbyCode()

      // Ensure unique code in dev mode
      while (devStore.lobbies.has(lobbyCode)) {
        lobbyCode = generateLobbyCode()
      }

      const lobby = {
        id: crypto.randomUUID(),
        lobby_code: lobbyCode,
        host_user_id: user.id,
        host_name: user.name,
        guest_user_id: null,
        guest_name: null,
        status: 'waiting',
        current_turn: 'X',
        board_state: Array(15)
          .fill(null)
          .map(() => Array(15).fill(null)),
        host_score: 0,
        guest_score: 0,
        current_question_index: 0,
        host_can_place: false,
        guest_can_place: false,
        winner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      devStore.lobbies.set(lobbyCode, lobby)

      return NextResponse.json({
        lobby,
        message: 'Lobby created successfully (dev mode)',
      })
    }

    // Production mode with Supabase
    const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_lobby_code')

    if (codeError) {
      logger.error('Error generating lobby code:', codeError)
      return NextResponse.json({ error: 'Failed to generate lobby code' }, { status: 500 })
    }

    // Create the lobby
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('game_lobbies')
      .insert({
        lobby_code: codeData,
        host_user_id: user.id,
        host_name: user.name,
        status: 'waiting',
        current_turn: 'X',
        host_score: 0,
        guest_score: 0,
        current_question_index: 0,
        host_can_place: false,
        guest_can_place: false,
      })
      .select()
      .single()

    if (lobbyError) {
      logger.error('Error creating lobby:', lobbyError)
      return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 })
    }

    return NextResponse.json({
      lobby,
      message: 'Lobby created successfully',
    })
  } catch (error) {
    logger.error('Error in create lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
