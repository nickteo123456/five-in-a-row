'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { useAuth } from './auth-provider'
import { useI18n } from './i18n-provider'
import { useQuestionBank } from '@/hooks/use-question-bank'
import { chooseComputerMove } from '@/lib/game/ai'
import {
  createEmptyBoard,
  findWinningLine,
  isBoardFull,
  nextPiece,
  placeOnBoard,
} from '@/lib/game/board'
import { advanceQueue, filterQuestions, retryMissedQuestion, shuffle } from '@/lib/game/questions'
import { isCorrectAnswer, pointsForDifficulty } from '@/lib/game/scoring'
import { addToTally, applyLobby, createInitialState, createPlayer } from '@/lib/game/state'
import { logger } from '@/lib/logger'
import { playSound } from '@/lib/sound'
import type {
  Answer,
  CellPosition,
  GameSetup,
  GameState,
  LobbySnapshot,
  Piece,
  Player,
  Question,
} from '@/types/game'

const POLL_INTERVAL_MS = 1500
const COMPUTER_DELAY_MS = 700
const ACTIVE_LOBBY_KEY = 'activeLobbyCode'
const LOCAL_TIME_LIMIT_SECONDS = 60
const ONLINE_TIME_LIMIT_SECONDS = 90

interface GameContextType {
  gameState: GameState
  questions: Question[]
  joinGame: (setup: GameSetup) => void
  answerQuestion: (answer: Answer) => Promise<boolean>
  placePiece: (row: number, col: number) => Promise<boolean>
  handleContinueAfterWrongAnswer: () => void
  completePhysicalPlacement: () => void
  resetBoard: () => Promise<void>
  leaveGame: () => Promise<void>
  createLobby: () => Promise<{ lobbyCode: string; lobbyId: string } | null>
  joinLobby: (lobbyCode: string) => Promise<boolean>
  startOnlineGame: () => Promise<boolean>
  resumeOnlineGame: () => Promise<void>
  requestRematch: () => Promise<void>
  cancelRematch: () => Promise<void>
  acceptRematch: () => Promise<void>
  declineRematch: () => Promise<void>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

async function patchLobby(lobbyId: string, updates: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch(`/api/lobby/${lobbyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    return response.ok
  } catch (error) {
    logger.error('Error updating lobby:', error)
    return false
  }
}

function rememberLobby(lobbyCode: string | null) {
  try {
    if (lobbyCode) localStorage.setItem(ACTIVE_LOBBY_KEY, lobbyCode)
    else localStorage.removeItem(ACTIVE_LOBBY_KEY)
  } catch {
    // Storage can be unavailable, for example in private browsing
  }
}

function recallLobby(): string | null {
  try {
    return localStorage.getItem(ACTIVE_LOBBY_KEY)
  } catch {
    return null
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth()
  const userId = user?.id
  const { t, translateError } = useI18n()
  const questions = useQuestionBank()
  const [gameState, setGameState] = useState<GameState>(createInitialState)

  // Timers and polling outlive a render, so they read the latest values from refs
  const stateRef = useRef(gameState)
  const questionsRef = useRef(questions)
  const queueRef = useRef<Question[]>([])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const computerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lobbyIndexRef = useRef<number | null>(null)

  const updateState = useCallback((update: (state: GameState) => GameState) => {
    stateRef.current = update(stateRef.current)
    setGameState(stateRef.current)
  }, [])

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  const onlineQuestion = useCallback((index: number | null) => {
    // Both players sort the same way, so an index means the same question
    const ordered = [...questionsRef.current].sort((a, b) => a.id.localeCompare(b.id))
    return ordered.length > 0 ? ordered[(index ?? 0) % ordered.length] : null
  }, [])

  const takeNextQuestion = useCallback(() => {
    const { question, queue } = advanceQueue(queueRef.current)
    queueRef.current = queue
    return question
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const clearComputerTimer = useCallback(() => {
    if (computerTimerRef.current) {
      clearTimeout(computerTimerRef.current)
      computerTimerRef.current = null
    }
  }, [])

  const recordAttempt = useCallback(
    (question: Question, answer: Answer) => {
      const { gameMode } = stateRef.current
      const isLoggedIn = user && !isGuest

      // A shared device can't say which student answered in local multiplayer
      if (!isLoggedIn || gameMode === 'multiplayer' || question.id.startsWith('fallback-')) return

      fetch('/api/quiz/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, answer }),
      }).catch((error) => logger.error('Error saving attempt:', error))
    },
    [user, isGuest]
  )

  const finishMove = useCallback(
    (state: GameState, move: CellPosition, piece: Piece): GameState => {
      const board = placeOnBoard(state.board, move, piece)
      const winningLine = findWinningLine(board, move, piece)
      const isDraw = !winningLine && isBoardFull(board)
      const turn = nextPiece(piece)
      const winner = winningLine
        ? state.players.find((player) => player.piece === piece) || null
        : null

      return {
        ...state,
        board,
        lastMove: move,
        winningLine,
        winner,
        isDraw,
        isGameOver: Boolean(winningLine) || isDraw,
        isGameActive: !winningLine && !isDraw,
        canPlacePiece: false,
        currentTurn: turn,
        currentPlayer: state.players.find((player) => player.piece === turn) || state.currentPlayer,
      }
    },
    []
  )

  const playComputerTurn = useCallback(() => {
    updateState((state) => ({ ...state, isComputerThinking: true }))

    computerTimerRef.current = setTimeout(() => {
      updateState((state) => {
        const computer = state.players.find((player) => player.isComputer)
        const move = computer && chooseComputerMove(state.board, computer.piece)
        if (!computer || !move) return { ...state, isComputerThinking: false }

        const next = finishMove({ ...state, isComputerThinking: false }, move, computer.piece)
        return next.isGameOver ? next : { ...next, currentQuestion: takeNextQuestion() }
      })

      const { winner, winningLine } = stateRef.current
      playSound(winningLine ? (winner?.isComputer ? 'lose' : 'win') : 'place')
    }, COMPUTER_DELAY_MS)
  }, [finishMove, takeNextQuestion, updateState])

  const joinGame = useCallback(
    ({ mode, boardMode = 'digital', player1Name, player2Name, filter, isTimed }: GameSetup) => {
      const players: Player[] = [createPlayer(crypto.randomUUID(), player1Name, 'X')]

      if (mode === 'multiplayer' && player2Name) {
        players.push(createPlayer(crypto.randomUUID(), player2Name, 'O'))
      }

      if (mode === 'single') {
        players.push({
          ...createPlayer('computer', t('game.computer'), 'O'),
          isComputer: true,
        })
      }

      queueRef.current = shuffle(filterQuestions(questionsRef.current, filter))

      updateState(() => ({
        ...createInitialState(),
        currentPlayer: players[0],
        players,
        gameMode: mode,
        isGameActive: true,
        boardMode,
        questionTimeLimit: isTimed ? LOCAL_TIME_LIMIT_SECONDS : null,
        currentQuestion: takeNextQuestion(),
      }))
    },
    [t, takeNextQuestion, updateState]
  )

  const answerQuestion = useCallback(
    async (answer: Answer): Promise<boolean> => {
      const { currentQuestion: question, currentPlayer: player, gameMode } = stateRef.current
      if (!question || !player) return false

      const isCorrect = isCorrectAnswer(question, answer)
      const points = isCorrect ? pointsForDifficulty(question.difficulty) : 0

      recordAttempt(question, answer)
      playSound(isCorrect ? 'correct' : 'wrong')

      if (!isCorrect && gameMode !== 'online') {
        queueRef.current = retryMissedQuestion(queueRef.current, question)
      }

      updateState((state) => ({
        ...state,
        players: state.players.map((candidate) =>
          candidate.id === player.id ? { ...candidate, score: candidate.score + points } : candidate
        ),
        currentPlayer: { ...player, score: player.score + points },
        canPlacePiece: isCorrect,
        pendingTurnSwitch: !isCorrect,
        tallies: { ...state.tallies, [player.id]: addToTally(state.tallies[player.id], isCorrect) },
        missedQuestions: isCorrect
          ? state.missedQuestions
          : [...state.missedQuestions, { playerId: player.id, question }],
      }))

      const { lobbyId, isHost, tallies } = stateRef.current

      if (gameMode === 'online' && lobbyId) {
        const side = isHost ? 'host' : 'guest'

        await patchLobby(lobbyId, {
          [`${side}_score`]: player.score + points,
          [`${side}_can_place`]: isCorrect,
          [`${side}_answered`]: tallies[player.id].answered,
          [`${side}_correct`]: tallies[player.id].correct,
        })
      }

      return isCorrect
    },
    [recordAttempt, updateState]
  )

  const placePiece = useCallback(
    async (row: number, col: number): Promise<boolean> => {
      const before = stateRef.current

      if (before.boardMode === 'physical' || !before.canPlacePiece || before.isGameOver) {
        return false
      }
      if (before.board[row][col] !== null) return false

      updateState((state) => finishMove(state, { row, col }, state.currentTurn))

      const after = stateRef.current
      const isWin = Boolean(after.winningLine)

      playSound(isWin ? 'win' : 'place')

      if (before.gameMode === 'online' && before.lobbyId) {
        const nextIndex = (lobbyIndexRef.current ?? 0) + 1
        lobbyIndexRef.current = nextIndex

        await patchLobby(before.lobbyId, {
          board_state: after.board,
          current_turn: after.currentTurn,
          host_can_place: false,
          guest_can_place: false,
          ...(after.isGameOver
            ? { status: 'completed', winner_id: after.winner?.id ?? null }
            : { current_question_index: nextIndex }),
        })

        if (!after.isGameOver) {
          updateState((state) => ({ ...state, currentQuestion: onlineQuestion(nextIndex) }))
        }

        return true
      }

      if (after.isGameOver) return true

      if (before.gameMode === 'single') {
        playComputerTurn()
      } else {
        updateState((state) => ({ ...state, currentQuestion: takeNextQuestion() }))
      }

      return true
    },
    [finishMove, onlineQuestion, playComputerTurn, takeNextQuestion, updateState]
  )

  const handleContinueAfterWrongAnswer = useCallback(() => {
    const { pendingTurnSwitch, gameMode, lobbyId, players, currentPlayer, currentTurn } =
      stateRef.current

    if (!pendingTurnSwitch) return

    const nextPlayer = players.find((player) => player.id !== currentPlayer?.id)
    const turn = nextPlayer?.piece || currentTurn

    updateState((state) => ({
      ...state,
      currentPlayer: nextPlayer || state.currentPlayer,
      currentTurn: turn,
      canPlacePiece: false,
      pendingTurnSwitch: false,
    }))

    if (gameMode === 'online' && lobbyId) {
      const nextIndex = (lobbyIndexRef.current ?? 0) + 1
      lobbyIndexRef.current = nextIndex
      patchLobby(lobbyId, { current_turn: turn, current_question_index: nextIndex })
      updateState((state) => ({ ...state, currentQuestion: onlineQuestion(nextIndex) }))
      return
    }

    if (gameMode === 'single') {
      playComputerTurn()
      return
    }

    updateState((state) => ({ ...state, currentQuestion: takeNextQuestion() }))
  }, [onlineQuestion, playComputerTurn, takeNextQuestion, updateState])

  const completePhysicalPlacement = useCallback(() => {
    if (stateRef.current.boardMode !== 'physical' || !stateRef.current.canPlacePiece) return

    updateState((state) => {
      const turn = nextPiece(state.currentTurn)

      return {
        ...state,
        currentTurn: turn,
        currentPlayer: state.players.find((player) => player.piece === turn) || state.currentPlayer,
        canPlacePiece: false,
        pendingTurnSwitch: false,
        currentQuestion: takeNextQuestion(),
      }
    })
  }, [takeNextQuestion, updateState])

  const resetLocalGame = useCallback(() => {
    clearComputerTimer()
    queueRef.current = shuffle(queueRef.current)

    updateState((state) => ({
      ...state,
      board: createEmptyBoard(),
      currentTurn: 'X',
      canPlacePiece: false,
      winner: null,
      isDraw: false,
      isGameOver: false,
      winningLine: null,
      lastMove: null,
      isGameActive: true,
      currentPlayer: state.players[0],
      players: state.players.map((player) => ({ ...player, score: 0 })),
      pendingTurnSwitch: false,
      isComputerThinking: false,
      missedQuestions: [],
      tallies: {},
      rematch: { isWaiting: false, requesterName: null, rejecterName: null },
      currentQuestion: state.gameMode === 'online' ? state.currentQuestion : takeNextQuestion(),
    }))
  }, [clearComputerTimer, takeNextQuestion, updateState])

  const resetBoard = useCallback(async () => {
    const { gameMode, lobbyId } = stateRef.current

    if (gameMode === 'online' && lobbyId) {
      const startIndex = Math.floor(Math.random() * Math.max(questionsRef.current.length, 1))
      const saved = await patchLobby(lobbyId, {
        board_state: createEmptyBoard(),
        current_turn: 'X',
        host_can_place: false,
        guest_can_place: false,
        winner_id: null,
        status: 'active',
        host_score: 0,
        guest_score: 0,
        host_answered: 0,
        host_correct: 0,
        guest_answered: 0,
        guest_correct: 0,
        current_question_index: startIndex,
      })

      if (!saved) {
        toast.error(t('game.resetFailed'))
        return
      }

      lobbyIndexRef.current = startIndex
      updateState((state) => ({ ...state, currentQuestion: onlineQuestion(startIndex) }))
    }

    resetLocalGame()
  }, [onlineQuestion, resetLocalGame, t, updateState])

  const leaveGame = useCallback(async () => {
    const { lobbyId, opponentLeft } = stateRef.current

    stopPolling()
    clearComputerTimer()
    rememberLobby(null)

    if (lobbyId && !opponentLeft) {
      try {
        await fetch(`/api/lobby/${lobbyId}`, { method: 'DELETE' })
      } catch (error) {
        logger.error('Error leaving lobby:', error)
      }
    }

    lobbyIndexRef.current = null
    queueRef.current = []
    updateState(() => createInitialState())
  }, [clearComputerTimer, stopPolling, updateState])

  const syncLobby = useCallback(
    async (lobbyId: string) => {
      // Skip hidden tabs; polling resumes when the player comes back
      if (typeof document !== 'undefined' && document.hidden) return

      try {
        const response = await fetch(`/api/lobby/${lobbyId}`)

        if (response.status === 404) {
          stopPolling()
          rememberLobby(null)

          if (!stateRef.current.isGameOver) {
            updateState((state) => ({ ...state, opponentLeft: true }))
          }
          return
        }

        if (!response.ok) return

        const { lobby }: { lobby: LobbySnapshot } = await response.json()
        const before = stateRef.current
        const myId = userId

        if (lobby.status === 'cancelled') {
          updateState((state) => ({ ...state, opponentLeft: true }))
          return
        }

        if (before.isHost && before.players.length === 1 && lobby.guest_user_id) {
          toast.info(t('lobby.playerJoined', { name: lobby.guest_name || '' }))
          playSound('correct')
        }

        updateState((state) => {
          const next = applyLobby(state, lobby)
          const indexChanged = lobby.current_question_index !== lobbyIndexRef.current

          return {
            ...next,
            currentQuestion: indexChanged
              ? onlineQuestion(lobby.current_question_index)
              : next.currentQuestion,
            rematch: {
              ...next.rematch,
              requesterName:
                lobby.play_again_request && lobby.play_again_request !== myId
                  ? lobby.play_again_requester_name || t('game.opponent')
                  : null,
              rejecterName:
                lobby.play_again_rejected && next.rematch.isWaiting
                  ? lobby.play_again_rejecter_name || t('game.opponent')
                  : next.rematch.rejecterName,
            },
          }
        })

        lobbyIndexRef.current = lobby.current_question_index

        const after = stateRef.current

        if (!before.isGameOver && after.isGameOver) {
          playSound(after.winner?.id === myId ? 'win' : 'lose')
        }
        if (before.currentTurn !== after.currentTurn && after.currentPlayer?.id === myId) {
          playSound('turn')
        }

        if (lobby.play_again_accepted && before.rematch.isWaiting) {
          await patchLobby(lobbyId, { play_again_accepted: false })
          resetLocalGame()
        }
      } catch (error) {
        logger.error('Error syncing lobby:', error)
      }
    },
    [onlineQuestion, resetLocalGame, stopPolling, t, updateState, userId]
  )

  const syncLobbyRef = useRef(syncLobby)

  useEffect(() => {
    syncLobbyRef.current = syncLobby
  }, [syncLobby])

  const startPolling = useCallback(
    (lobbyId: string) => {
      stopPolling()
      pollingRef.current = setInterval(() => syncLobbyRef.current(lobbyId), POLL_INTERVAL_MS)
      syncLobbyRef.current(lobbyId)
    },
    [stopPolling]
  )

  const enterLobby = useCallback(
    (lobby: LobbySnapshot) => {
      const isHost = lobby.host_user_id === userId

      lobbyIndexRef.current = lobby.current_question_index
      rememberLobby(lobby.lobby_code)

      updateState((state) => ({
        ...applyLobby({ ...createInitialState(), isHost, board: state.board }, lobby),
        gameMode: 'online',
        lobbyId: lobby.id,
        lobbyCode: lobby.lobby_code,
        isHost,
        questionTimeLimit: ONLINE_TIME_LIMIT_SECONDS,
        currentQuestion: onlineQuestion(lobby.current_question_index),
      }))

      startPolling(lobby.id)
    },
    [onlineQuestion, startPolling, updateState, userId]
  )

  const createLobby = useCallback(async () => {
    try {
      const response = await fetch('/api/lobby/create', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        toast.error(t('lobby.createFailed'), { description: translateError(data.error) })
        return null
      }

      enterLobby(data.lobby)
      return { lobbyCode: data.lobby.lobby_code as string, lobbyId: data.lobby.id as string }
    } catch (error) {
      logger.error('Error creating lobby:', error)
      toast.error(t('lobby.createFailed'))
      return null
    }
  }, [enterLobby, t, translateError])

  const joinLobby = useCallback(
    async (lobbyCode: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/lobby/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lobbyCode }),
        })
        const data = await response.json()

        if (!response.ok) {
          toast.error(t('lobby.joinFailed'), { description: translateError(data.error) })
          return false
        }

        enterLobby(data.lobby)
        return true
      } catch (error) {
        logger.error('Error joining lobby:', error)
        toast.error(t('lobby.joinFailed'))
        return false
      }
    },
    [enterLobby, t, translateError]
  )

  const startOnlineGame = useCallback(async () => {
    const { lobbyId } = stateRef.current
    if (!lobbyId) return false

    const startIndex = Math.floor(Math.random() * Math.max(questionsRef.current.length, 1))
    const started = await patchLobby(lobbyId, {
      status: 'active',
      current_question_index: startIndex,
    })

    if (started) {
      lobbyIndexRef.current = startIndex
      updateState((state) => ({ ...state, currentQuestion: onlineQuestion(startIndex) }))
    }

    return started
  }, [onlineQuestion, updateState])

  // Puts a player back into their game after a refresh or a dropped connection
  const resumeOnlineGame = useCallback(async () => {
    const lobbyCode = recallLobby()
    if (!lobbyCode || !user || isGuest || stateRef.current.lobbyId) return

    try {
      const response = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyCode }),
      })

      if (!response.ok) {
        rememberLobby(null)
        return
      }

      const { lobby }: { lobby: LobbySnapshot } = await response.json()
      enterLobby(lobby)
      toast.success(t('lobby.reconnected'))
    } catch (error) {
      logger.error('Error resuming game:', error)
    }
  }, [enterLobby, isGuest, t, user])

  const requestRematch = useCallback(async () => {
    const { lobbyId } = stateRef.current
    if (!lobbyId || !user) return

    updateState((state) => ({
      ...state,
      rematch: { ...state.rematch, isWaiting: true, rejecterName: null },
    }))

    await patchLobby(lobbyId, {
      play_again_request: user.id,
      play_again_requester_name: user.name,
      play_again_accepted: false,
      play_again_rejected: false,
    })
  }, [updateState, user])

  const cancelRematch = useCallback(async () => {
    const { lobbyId } = stateRef.current
    if (!lobbyId) return

    updateState((state) => ({ ...state, rematch: { ...state.rematch, isWaiting: false } }))
    await patchLobby(lobbyId, { play_again_request: null, play_again_requester_name: null })
  }, [updateState])

  const acceptRematch = useCallback(async () => {
    const { lobbyId } = stateRef.current
    if (!lobbyId) return

    await patchLobby(lobbyId, {
      play_again_request: null,
      play_again_requester_name: null,
      play_again_accepted: true,
    })
    await resetBoard()
  }, [resetBoard])

  const declineRematch = useCallback(async () => {
    const { lobbyId } = stateRef.current
    if (!lobbyId) return

    await patchLobby(lobbyId, {
      play_again_request: null,
      play_again_requester_name: null,
      play_again_rejected: true,
      play_again_rejecter_name: user?.name ?? null,
    })
    await leaveGame()
  }, [leaveGame, user?.name])

  useEffect(
    () => () => {
      stopPolling()
      clearComputerTimer()
    },
    [clearComputerTimer, stopPolling]
  )

  const value = useMemo(
    () => ({
      gameState,
      questions,
      joinGame,
      answerQuestion,
      placePiece,
      handleContinueAfterWrongAnswer,
      completePhysicalPlacement,
      resetBoard,
      leaveGame,
      createLobby,
      joinLobby,
      startOnlineGame,
      resumeOnlineGame,
      requestRematch,
      cancelRematch,
      acceptRematch,
      declineRematch,
    }),
    [
      gameState,
      questions,
      joinGame,
      answerQuestion,
      placePiece,
      handleContinueAfterWrongAnswer,
      completePhysicalPlacement,
      resetBoard,
      leaveGame,
      createLobby,
      joinLobby,
      startOnlineGame,
      resumeOnlineGame,
      requestRematch,
      cancelRematch,
      acceptRematch,
      declineRematch,
    ]
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
