import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { findUserById } from '@/lib/database'
import { findLobby, isLobbyMember } from '@/lib/lobbies'
import { requireUser } from '@/lib/session'
import { joinLobbySchema, parseBody } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const body = await parseBody(request, joinLobbySchema)
    if (body instanceof NextResponse) return body

    const user = await findUserById(session.userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if lobby exists and is available
    const lobby = await findLobby(body.lobbyCode)

    // Someone already in the lobby is reconnecting after a refresh
    if (lobby && isLobbyMember(lobby, user.id)) {
      return NextResponse.json({ lobby, message: 'Rejoined lobby' })
    }

    if (!lobby || lobby.status !== 'waiting') {
      return NextResponse.json({ error: 'Lobby not found or not available' }, { status: 404 })
    }

    if (lobby.guest_user_id) {
      return NextResponse.json({ error: 'Lobby is full' }, { status: 400 })
    }

    // Both players present, waiting for host to start
    const updates = { guest_user_id: user.id, guest_name: user.name, status: 'ready' }

    // Development mode
    if (isDevMode) {
      Object.assign(lobby, updates, { updated_at: new Date().toISOString() })

      return NextResponse.json({
        lobby,
        message: 'Joined lobby successfully (dev mode)',
      })
    }

    // Production mode with Supabase
    const { data: updatedLobby, error: updateError } = await supabaseAdmin
      .from('game_lobbies')
      .update(updates)
      .eq('id', lobby.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error joining lobby:', updateError)
      return NextResponse.json({ error: 'Failed to join lobby' }, { status: 500 })
    }

    return NextResponse.json({
      lobby: {
        ...updatedLobby,
        host_name: lobby.host_name,
        guest_name: user.name,
      },
      message: 'Joined lobby successfully',
    })
  } catch (error) {
    logger.error('Error in join lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
