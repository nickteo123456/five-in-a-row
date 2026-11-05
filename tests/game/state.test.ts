import { describe, expect, it } from 'vitest'
import { createEmptyBoard, placeOnBoard } from '@/lib/game/board'
import { addToTally, applyLobby, createInitialState, lobbyPlayers } from '@/lib/game/state'
import type { LobbySnapshot } from '@/types/game'

const lobby = (overrides: Partial<LobbySnapshot> = {}): LobbySnapshot => ({
  id: 'lobby',
  lobby_code: '12345',
  status: 'active',
  host_user_id: 'host',
  host_name: 'Hana',
  guest_user_id: 'guest',
  guest_name: 'Gus',
  host_score: 10,
  guest_score: 5,
  host_can_place: true,
  guest_can_place: false,
  current_turn: 'O',
  board_state: createEmptyBoard(),
  current_question_index: 0,
  winner_id: null,
  ...overrides,
})

describe('addToTally', () => {
  it('counts answers', () => {
    expect(addToTally(undefined, true)).toEqual({ answered: 1, correct: 1 })
    expect(addToTally({ answered: 1, correct: 1 }, false)).toEqual({ answered: 2, correct: 1 })
  })
})

describe('lobbyPlayers', () => {
  it('builds host and guest', () => {
    const players = lobbyPlayers(lobby({ guest_online: false }))

    expect(players.map(({ piece }) => piece)).toEqual(['X', 'O'])
    expect(players[0].score).toBe(10)
    expect(players[1].isOnline).toBe(false)
  })

  it('leaves out an empty guest slot', () => {
    expect(lobbyPlayers(lobby({ guest_user_id: null }))).toHaveLength(1)
  })
})

describe('applyLobby', () => {
  const joined = () => applyLobby({ ...createInitialState(), isHost: true }, lobby())

  it('follows the turn from the server', () => {
    expect(joined().currentPlayer?.id).toBe('guest')
  })

  it('reads the placing permission for this side', () => {
    expect(joined().canPlacePiece).toBe(true)

    const asGuest = applyLobby({ ...createInitialState(), isHost: false }, lobby())
    expect(asGuest.canPlacePiece).toBe(false)
  })

  it('marks the last move', () => {
    const board = placeOnBoard(createEmptyBoard(), { row: 3, col: 3 }, 'X')
    expect(applyLobby(joined(), lobby({ board_state: board })).lastMove).toEqual({
      row: 3,
      col: 3,
    })
  })

  it('shows the winner and winning line', () => {
    const board = [3, 4, 5, 6, 7].reduce(
      (next, col) => placeOnBoard(next, { row: 7, col }, 'X'),
      createEmptyBoard()
    )
    const state = applyLobby(
      joined(),
      lobby({ board_state: board, status: 'completed', winner_id: 'host' })
    )

    expect(state.isGameOver).toBe(true)
    expect(state.winner?.name).toBe('Hana')
    expect(state.winningLine).toHaveLength(5)
  })

  it('notices when the opponent leaves during a game', () => {
    const state = applyLobby(joined(), lobby({ guest_user_id: null, status: 'waiting' }))
    expect(state.opponentLeft).toBe(true)
  })
})
