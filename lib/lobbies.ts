import { supabaseAdmin, isDevMode } from './supabase'
import { devStore } from './dev-store'
import { logger } from './logger'
import { recordMatchResult } from './match-results'
import type { LobbyUpdate } from './validation'

export interface Lobby {
  id: string
  lobby_code: string
  host_user_id: string
  host_name: string | null
  guest_user_id: string | null
  guest_name: string | null
  status: string
  host_score: number
  guest_score: number
  winner_id: string | null
  host_answered?: number
  host_correct?: number
  guest_answered?: number
  guest_correct?: number
  host_last_seen?: string | null
  guest_last_seen?: string | null
  started_at?: string | null
  updated_at: string
  [column: string]: unknown
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOBBY_CODE_PATTERN = /^\d{5}$/
const PRESENCE_TIMEOUT_MS = 20 * 1000
const PRESENCE_WRITE_INTERVAL_MS = 8 * 1000

const LOBBY_COLUMNS = `
  *,
  host:users!game_lobbies_host_user_id_fkey(id, name),
  guest:users!game_lobbies_guest_user_id_fkey(id, name)
`

type LobbyRow = Lobby & { host?: { name: string } | null; guest?: { name: string } | null }

function withPlayerNames(lobby: LobbyRow): Lobby {
  return { ...lobby, host_name: lobby.host?.name ?? null, guest_name: lobby.guest?.name ?? null }
}

// Accepts a lobby id or a 5-digit lobby code.
export async function findLobby(idOrCode: string): Promise<Lobby | null> {
  const column = UUID_PATTERN.test(idOrCode)
    ? 'id'
    : LOBBY_CODE_PATTERN.test(idOrCode)
      ? 'lobby_code'
      : null

  if (!column) return null

  if (isDevMode) {
    return Array.from(devStore.lobbies.values()).find((lobby) => lobby[column] === idOrCode) || null
  }

  const { data, error } = await supabaseAdmin
    .from('game_lobbies')
    .select(LOBBY_COLUMNS)
    .eq(column, idOrCode)
    .maybeSingle()

  if (error) throw error

  return data ? withPlayerNames(data as unknown as LobbyRow) : null
}

function isRecent(timestamp: string | null | undefined): boolean {
  return !timestamp || Date.now() - new Date(timestamp).getTime() < PRESENCE_TIMEOUT_MS
}

export function withPresence(lobby: Lobby) {
  return {
    ...lobby,
    host_online: isRecent(lobby.host_last_seen),
    guest_online: isRecent(lobby.guest_last_seen),
  }
}

// Notes that a player is still polling. Throttled, because polling is frequent.
export async function touchLobbyPresence(lobby: Lobby, userId: string): Promise<void> {
  const column = lobby.host_user_id === userId ? 'host_last_seen' : 'guest_last_seen'
  const lastSeen = lobby[column]

  if (lastSeen && Date.now() - new Date(lastSeen).getTime() < PRESENCE_WRITE_INTERVAL_MS) return

  const now = new Date().toISOString()
  lobby[column] = now

  if (isDevMode) return

  const { error } = await supabaseAdmin
    .from('game_lobbies')
    .update({ [column]: now })
    .eq('id', lobby.id)

  if (error) logger.error('Error updating presence:', error)
}

export function isLobbyMember(lobby: Lobby, userId: string): boolean {
  return lobby.host_user_id === userId || lobby.guest_user_id === userId
}

// The first update that completes a game also records the result for both
// players, so a retried or repeated update can't count the match twice.
export async function updateLobby(lobby: Lobby, updates: LobbyUpdate): Promise<Lobby | null> {
  const completing = updates.status === 'completed'
  const starting = updates.status === 'active' && lobby.status !== 'active'
  const changes = starting ? { ...updates, started_at: new Date().toISOString() } : updates

  if (isDevMode) {
    const alreadyCompleted = lobby.status === 'completed'
    Object.assign(lobby, changes, { updated_at: new Date().toISOString() })

    if (completing && !alreadyCompleted) {
      await recordMatchResult(lobby)
    }

    return lobby
  }

  let query = supabaseAdmin.from('game_lobbies').update(changes).eq('id', lobby.id)

  if (completing) {
    query = query.neq('status', 'completed')
  }

  const { data, error } = await query.select(LOBBY_COLUMNS).maybeSingle()

  if (error) throw error

  if (!data) return findLobby(lobby.id)

  const updatedLobby = withPlayerNames(data as unknown as LobbyRow)

  if (completing) {
    await recordMatchResult(updatedLobby)
  }

  return updatedLobby
}

export async function deleteLobby(lobby: Lobby): Promise<void> {
  if (isDevMode) {
    devStore.lobbies.delete(lobby.lobby_code)
    return
  }

  const { error } = await supabaseAdmin.from('game_lobbies').delete().eq('id', lobby.id)

  if (error) throw error
}

export async function removeLobbyGuest(lobby: Lobby): Promise<void> {
  const updates = { guest_user_id: null, guest_name: null, status: 'waiting' }

  if (isDevMode) {
    Object.assign(lobby, updates, { updated_at: new Date().toISOString() })
    return
  }

  const { error } = await supabaseAdmin.from('game_lobbies').update(updates).eq('id', lobby.id)

  if (error) throw error
}
