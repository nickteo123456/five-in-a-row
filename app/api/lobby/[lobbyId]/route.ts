import { NextRequest, NextResponse } from 'next/server'
import {
  deleteLobby,
  findLobby,
  isLobbyMember,
  removeLobbyGuest,
  touchLobbyPresence,
  updateLobby,
  withPresence,
} from '@/lib/lobbies'
import { requireUser } from '@/lib/session'
import { lobbyUpdateSchema, parseBody } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET - Fetch lobby details. Open to any logged-in user, since a player looks
// the lobby up by code before joining it.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lobbyId: string }> }
) {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const { lobbyId } = await params
    const lobby = await findLobby(lobbyId)

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (isLobbyMember(lobby, session.userId)) {
      await touchLobbyPresence(lobby, session.userId)
    }

    return NextResponse.json({ lobby: withPresence(lobby) })
  } catch (error) {
    logger.error('Error in get lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update lobby state (for game moves, scores, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lobbyId: string }> }
) {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const updates = await parseBody(request, lobbyUpdateSchema)
    if (updates instanceof NextResponse) return updates

    const { lobbyId } = await params
    const lobby = await findLobby(lobbyId)

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (!isLobbyMember(lobby, session.userId)) {
      return NextResponse.json({ error: 'You are not a member of this lobby' }, { status: 403 })
    }

    // Both fields hold a player id, so they must point at someone in the lobby
    for (const playerId of [updates.winner_id, updates.play_again_request]) {
      if (playerId && !isLobbyMember(lobby, playerId)) {
        return NextResponse.json({ error: 'Player is not a member of this lobby' }, { status: 400 })
      }
    }

    const updatedLobby = await updateLobby(lobby, updates)

    return NextResponse.json({
      lobby: updatedLobby,
      message: 'Lobby updated successfully',
    })
  } catch (error) {
    logger.error('Error in update lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Leave/Cancel lobby
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lobbyId: string }> }
) {
  try {
    const session = await requireUser()
    if (session instanceof NextResponse) return session

    const { lobbyId } = await params
    const lobby = await findLobby(lobbyId)

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // If host leaves, delete the lobby immediately to free up the code
    if (lobby.host_user_id === session.userId) {
      await deleteLobby(lobby)
      return NextResponse.json({ message: 'Lobby deleted successfully' })
    }

    // If guest leaves, just remove them
    if (lobby.guest_user_id === session.userId) {
      await removeLobbyGuest(lobby)
      return NextResponse.json({ message: 'Left lobby successfully' })
    }

    return NextResponse.json({ error: 'You are not a member of this lobby' }, { status: 403 })
  } catch (error) {
    logger.error('Error in delete lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
