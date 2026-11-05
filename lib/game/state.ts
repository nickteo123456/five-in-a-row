import type { AnswerTally, GameState, LobbySnapshot, Player } from '@/types/game'
import { createEmptyBoard, findAnyWinningLine, findNewMove } from './board'

export function createPlayer(id: string, name: string, piece: Player['piece']): Player {
  return { id, name, score: 0, isOnline: true, piece }
}

export function createInitialState(): GameState {
  return {
    currentPlayer: null,
    players: [],
    gameMode: 'single',
    currentQuestion: null,
    isGameActive: false,
    board: createEmptyBoard(),
    currentTurn: 'X',
    canPlacePiece: false,
    winner: null,
    isDraw: false,
    isGameOver: false,
    winningLine: null,
    lastMove: null,
    lobbyId: null,
    lobbyCode: null,
    isHost: false,
    pendingTurnSwitch: false,
    boardMode: 'digital',
    isComputerThinking: false,
    questionTimeLimit: null,
    opponentLeft: false,
    rematch: { isWaiting: false, requesterName: null, rejecterName: null },
    missedQuestions: [],
    tallies: {},
  }
}

export function addToTally(tally: AnswerTally | undefined, isCorrect: boolean): AnswerTally {
  return {
    answered: (tally?.answered ?? 0) + 1,
    correct: (tally?.correct ?? 0) + (isCorrect ? 1 : 0),
  }
}

export function lobbyPlayers(lobby: LobbySnapshot): Player[] {
  const host: Player = {
    ...createPlayer(lobby.host_user_id, lobby.host_name || 'Host', 'X'),
    score: lobby.host_score || 0,
    isOnline: lobby.host_online ?? true,
  }

  if (!lobby.guest_user_id) return [host]

  const guest: Player = {
    ...createPlayer(lobby.guest_user_id, lobby.guest_name || 'Guest', 'O'),
    score: lobby.guest_score || 0,
    isOnline: lobby.guest_online ?? true,
  }

  return [host, guest]
}

// Applies the server's view of a lobby to the local game
export function applyLobby(state: GameState, lobby: LobbySnapshot): GameState {
  const players = lobbyPlayers(lobby)
  const board = lobby.board_state || state.board
  const currentTurn = lobby.current_turn || state.currentTurn
  const isGameOver = lobby.status === 'completed'
  const opponentJustLeft = state.isGameActive && state.players.length === 2 && players.length === 1

  return {
    ...state,
    players,
    isGameActive: lobby.status === 'active',
    board,
    currentTurn,
    canPlacePiece: state.isHost ? lobby.host_can_place : lobby.guest_can_place,
    currentPlayer: players.find((player) => player.piece === currentTurn) || players[0],
    winner: lobby.winner_id
      ? players.find((player) => player.id === lobby.winner_id) || null
      : null,
    isGameOver,
    winningLine: isGameOver ? findAnyWinningLine(board) : null,
    lastMove: findNewMove(state.board, board) || state.lastMove,
    opponentLeft: state.opponentLeft || opponentJustLeft,
  }
}
