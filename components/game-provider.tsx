"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { toast } from "sonner"

interface Player {
  id: string
  name: string
  score: number
  avatar: string
  isOnline: boolean
  piece: "X" | "O"
}

type BoardCell = "X" | "O" | null

type BoardMode = "digital" | "physical"

interface GameState {
  currentPlayer: Player | null
  players: Player[]
  gameMode: "single" | "multiplayer" | "online"
  currentQuestion: Question | null
  gameSession: string | null
  isGameActive: boolean
  board: BoardCell[][]
  currentTurn: "X" | "O"
  canPlacePiece: boolean
  winner: Player | null
  isGameOver: boolean
  lobbyId: string | null
  lobbyCode: string | null
  isHost: boolean
  pendingTurnSwitch: boolean // Track if we need to switch turn after user clicks Continue
  boardMode: BoardMode
}

interface Question {
  id: string
  type: "multiple-choice" | "code-completion" | "true-false"
  question: string
  code?: string
  options?: string[]
  correctAnswer: string | number
  explanation: string
  difficulty: "beginner" | "intermediate" | "advanced"
  topic: string
}

interface GameContextType {
  gameState: GameState
  joinGame: (
    playerName: string,
    gameMode: "single" | "multiplayer" | "online",
    player2Name?: string,
    boardMode?: BoardMode
  ) => void
  scanQRCode: (qrData: string) => void
  answerQuestion: (answer: string | number) => boolean
  nextQuestion: () => void
  updateScore: (playerId: string, points: number) => void
  leaveGame: () => void
  placePiece: (row: number, col: number) => boolean
  resetBoard: () => void
  addSecondPlayer: (playerName: string) => void
  createLobby: (userId: string, userName: string) => Promise<{lobbyCode: string, lobbyId: string} | null>
  joinLobby: (lobbyCode: string, userId: string, userName: string) => Promise<boolean>
  syncLobbyState: (lobbyId?: string) => Promise<void>
  handleContinueAfterWrongAnswer: () => void
  completePhysicalPlacement: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

// Transform database question to game question format
function transformDbQuestionToGameQuestion(dbQuestion: any): Question {
  const options = [
    dbQuestion.option_a,
    dbQuestion.option_b,
    dbQuestion.option_c,
    dbQuestion.option_d,
  ];

  return {
    id: dbQuestion.id || Math.random().toString(36).substr(2, 9),
    type: "multiple-choice",
    question: dbQuestion.question,
    options,
    correctAnswer: dbQuestion.correct_answer,
    explanation: dbQuestion.explanation,
    difficulty: dbQuestion.difficulty || "beginner",
    topic: dbQuestion.topic || "Python",
  };
}

// Fallback questions in case database fetch fails
const fallbackQuestions: Question[] = [
  {
    id: "1",
    type: "multiple-choice",
    question: "Which keyword is used to define a function in Python?",
    options: ["function", "def", "define", "func"],
    correctAnswer: 1,
    explanation: 'The "def" keyword is used to define functions in Python.',
    difficulty: "beginner",
    topic: "Function Definition",
  },
  {
    id: "2",
    type: "code-completion",
    question: "Complete this function to return the sum of two numbers:",
    code: "def add_numbers(a, b):\n    # Complete this function\n    ____",
    correctAnswer: "return a + b",
    explanation: "Functions use the return statement to send back a value to the caller.",
    difficulty: "beginner",
    topic: "Return Values",
  },
  {
    id: "3",
    type: "multiple-choice",
    question: "What will this function return?\n\ndef mystery_func(x=5):\n    return x * 2\n\nresult = mystery_func()",
    options: ["5", "10", "0", "Error"],
    correctAnswer: 1,
    explanation: "The function uses a default parameter value of 5, so mystery_func() returns 5 * 2 = 10.",
    difficulty: "intermediate",
    topic: "Default Parameters",
  },
  {
    id: "4",
    type: "true-false",
    question: "Variables defined inside a function are accessible from outside the function.",
    correctAnswer: 0,
    explanation: "Variables defined inside a function have local scope and are not accessible outside the function.",
    difficulty: "intermediate",
    topic: "Function Scope",
  },
  {
    id: "5",
    type: "multiple-choice",
    question: "Which built-in function returns the length of a list?",
    options: ["size()", "length()", "len()", "count()"],
    correctAnswer: 2,
    explanation: "The len() function returns the number of items in a sequence or collection.",
    difficulty: "beginner",
    topic: "Built-in Functions",
  },
]

export function GameProvider({ children }: { children: ReactNode }) {
  const createEmptyBoard = (): BoardCell[][] => {
    return Array(15)
      .fill(null)
      .map(() => Array(15).fill(null))
  }

  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: null,
    players: [],
    gameMode: "single",
    currentQuestion: null,
    gameSession: null,
    isGameActive: false,
    board: createEmptyBoard(),
    currentTurn: "X",
    canPlacePiece: false,
    winner: null,
    isGameOver: false,
    lobbyId: null,
    lobbyCode: null,
    isHost: false,
    pendingTurnSwitch: false,
    boardMode: "digital",
  })

  const [questionIndex, setQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoaded, setQuestionsLoaded] = useState(false)
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Fetch random questions from database (get 50 questions)
        const response = await fetch('/api/questions?random=true&count=50')
        if (response.ok) {
          const data = await response.json()
          if (data.questions && data.questions.length > 0) {
            const transformedQuestions = data.questions.map(transformDbQuestionToGameQuestion)
            setQuestions(transformedQuestions)
            setQuestionsLoaded(true)
            console.log(`Loaded ${transformedQuestions.length} questions from database`)
          } else {
            // No questions in database, use fallback
            console.warn('No questions found in database, using fallback questions')
            setQuestions(fallbackQuestions)
            setQuestionsLoaded(true)
          }
        } else {
          // API error, use fallback
          console.warn('Failed to fetch questions from API, using fallback questions')
          setQuestions(fallbackQuestions)
          setQuestionsLoaded(true)
        }
      } catch (error) {
        // Network error, use fallback
        console.error('Error fetching questions:', error)
        setQuestions(fallbackQuestions)
        setQuestionsLoaded(true)
      }
    }

    fetchQuestions()
  }, [])

  const joinGame = (
    playerName: string,
    gameMode: "single" | "multiplayer",
    player2Name?: string,
    boardMode: BoardMode = "digital",
  ) => {
    const player1: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: playerName,
      score: 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName}`,
      isOnline: true,
      piece: "X",
    }

    const players = [player1]
    
    // If local multiplayer mode, create player 2
    if (gameMode === "multiplayer" && player2Name) {
      const player2: Player = {
        id: Math.random().toString(36).substr(2, 9),
        name: player2Name,
        score: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${player2Name}`,
        isOnline: true,
        piece: "O",
      }
      players.push(player2)
    }

    setGameState((prev) => ({
      ...prev,
      currentPlayer: player1, // Player 1 starts first
      players,
      gameMode,
      gameSession: Math.random().toString(36).substr(2, 9),
      isGameActive: true,
      currentQuestion: questions.length > 0 ? questions[0] : null,
      board: createEmptyBoard(),
      currentTurn: "X",
      canPlacePiece: false,
      winner: null,
      isGameOver: false,
      pendingTurnSwitch: false,
      boardMode,
    }))
    setQuestionIndex(0)
    // Mark first question as used
    if (questions.length > 0) {
      setUsedQuestionIds(new Set([questions[0].id]))
    }
  }

  const addSecondPlayer = (playerName: string) => {
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: playerName,
      score: 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName}`,
      isOnline: true,
      piece: "O",
    }

    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
      gameMode: "multiplayer",
    }))
  }

  const scanQRCode = (qrData: string) => {
    try {
      const data = JSON.parse(qrData)
      if (data.type === "question" && data.questionId) {
        const question = questions.find((q) => q.id === data.questionId)
        if (question) {
          setGameState((prev) => ({ ...prev, currentQuestion: question }))
        }
      } else if (data.type === "bonus") {
        if (gameState.currentPlayer) {
          updateScore(gameState.currentPlayer.id, data.points || 10)
        }
      }
    } catch {
      if (questions.length > 0) {
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)]
        setGameState((prev) => ({ ...prev, currentQuestion: randomQuestion }))
      }
    }
  }

  const answerQuestion = async (answer: string | number): Promise<boolean> => {
    if (!gameState.currentQuestion || !gameState.currentPlayer) return false

    const isCorrect = gameState.currentQuestion.correctAnswer === answer

    if (isCorrect) {
      const points =
        gameState.currentQuestion.difficulty === "beginner"
          ? 10
          : gameState.currentQuestion.difficulty === "intermediate"
            ? 15
            : 20
      updateScore(gameState.currentPlayer.id, points)
      setGameState((prev) => ({
        ...prev,
        canPlacePiece: true,
      }))

      // Sync with server in online mode
      if (gameState.gameMode === "online" && gameState.lobbyId) {
        const updatedPlayer = gameState.players.find(p => p.id === gameState.currentPlayer?.id)
        const newScore = (updatedPlayer?.score || 0) + points

        try {
          await fetch(`/api/lobby/${gameState.lobbyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              [gameState.isHost ? 'host_score' : 'guest_score']: newScore,
              [gameState.isHost ? 'host_can_place' : 'guest_can_place']: true,
            }),
          })
        } catch (error) {
          console.error('Error syncing answer to server:', error)
        }
      }
    } else {
      // Wrong answer - mark that we need to switch turn after user clicks Continue
      if ((gameState.gameMode === "multiplayer" || gameState.gameMode === "online") && gameState.players.length === 2) {
        setGameState((prev) => ({
          ...prev,
          pendingTurnSwitch: true,
        }))
      }
    }

    return isCorrect
  }

  const checkWinner = (board: BoardCell[][], row: number, col: number, piece: "X" | "O"): boolean => {
    const directions = [
      [0, 1], // horizontal
      [1, 0], // vertical
      [1, 1], // diagonal \
      [1, -1], // diagonal /
    ]

    for (const [dx, dy] of directions) {
      let count = 1

      // Check positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i
        const newCol = col + dy * i
        if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] === piece) {
          count++
        } else {
          break
        }
      }

      // Check negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i
        const newCol = col - dy * i
        if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] === piece) {
          count++
        } else {
          break
        }
      }

      if (count >= 5) return true
    }

    return false
  }

  const placePiece = async (row: number, col: number): Promise<boolean> => {
    if (gameState.boardMode === "physical") {
      return false
    }

    if (!gameState.canPlacePiece || gameState.isGameOver) return false
    if (gameState.board[row][col] !== null) return false

    const newBoard = gameState.board.map((r) => [...r])
    newBoard[row][col] = gameState.currentTurn

    const hasWon = checkWinner(newBoard, row, col, gameState.currentTurn)
    const currentWinner = hasWon ? gameState.players.find((p) => p.piece === gameState.currentTurn) || null : null

    setGameState((prev) => ({
      ...prev,
      board: newBoard,
      canPlacePiece: false,
      currentTurn: prev.currentTurn === "X" ? "O" : "X",
      winner: currentWinner,
      isGameOver: hasWon,
      isGameActive: !hasWon, // End the game when someone wins
      currentPlayer:
        prev.gameMode === "multiplayer" || prev.gameMode === "online"
          ? prev.players.find((p) => p.piece === (prev.currentTurn === "X" ? "O" : "X")) || prev.currentPlayer
          : prev.currentPlayer,
    }))

    // Sync with server in online mode
    if (gameState.gameMode === "online" && gameState.lobbyId) {
      try {
        const updateData: any = {
          board_state: newBoard,
          current_turn: gameState.currentTurn === "X" ? "O" : "X",
          // After placing, both players need to answer before placing again
          host_can_place: false,
          guest_can_place: false,
        }

        if (hasWon) {
          updateData.status = 'completed'
          updateData.winner_id = currentWinner?.id
        } else {
          updateData.current_question_index = questions.length > 0 ? (questionIndex + 1) % questions.length : 0
        }

        await fetch(`/api/lobby/${gameState.lobbyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
      } catch (error) {
        console.error('Error syncing piece placement to server:', error)
      }
    }

    if (!hasWon) {
      nextQuestion()
    } else {
      // Save stats and match history to database when game ends
      try {
        const loser = gameState.players.find(p => p.id !== currentWinner?.id)
        
        // Update stats for winner
        if (currentWinner) {
          await fetch('/api/student/update-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentWinner.id,
              score: currentWinner.score,
              isWin: true,
            }),
          })
          
          // Save match history for winner
          await fetch('/api/match-history/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentWinner.id,
              score: currentWinner.score,
              gameMode: gameState.gameMode,
              opponentName: loser?.name || 'Unknown',
              opponentScore: loser?.score || 0,
              isWinner: true,
              duration: 0, // Can track this later
            }),
          })
        }
        
        // Update stats for loser
        if (loser) {
          await fetch('/api/student/update-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: loser.id,
              score: loser.score,
              isWin: false,
            }),
          })
          
          // Save match history for loser
          await fetch('/api/match-history/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: loser.id,
              score: loser.score,
              gameMode: gameState.gameMode,
              opponentName: currentWinner?.name || 'Unknown',
              opponentScore: currentWinner?.score || 0,
              isWinner: false,
              duration: 0,
            }),
          })
        }
      } catch (error) {
        console.error('Error updating player stats and match history:', error)
      }
    }

    return true
  }

  const resetBoard = async () => {
    // For online games, reset the lobby state on the server
    if (gameState.gameMode === "online" && gameState.lobbyId) {
      try {
        await fetch(`/api/lobby/${gameState.lobbyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            board_state: createEmptyBoard(),
            current_turn: 'X',
            host_can_place: false,
            guest_can_place: false,
            winner_id: null,
            status: 'active',
            host_score: 0,
            guest_score: 0,
            current_question_index: 0,
          }),
        })
      } catch (error) {
        console.error('Error resetting lobby on server:', error)
        toast.error('Failed to reset game')
        return
      }
    }

    // Reset local state
    setGameState((prev) => ({
      ...prev,
      board: createEmptyBoard(),
      currentTurn: "X",
      canPlacePiece: false,
      winner: null,
      isGameOver: false,
      isGameActive: true, // Reactivate the game
      currentPlayer: prev.players[0],
      players: prev.players.map(p => ({ ...p, score: 0 })), // Reset scores
      pendingTurnSwitch: false,
      boardMode: prev.boardMode,
    }))
    setQuestionIndex(0)
    // Reset used questions and mark first question as used
    if (questions.length > 0) {
      setUsedQuestionIds(new Set([questions[0].id]))
    }
    setGameState((prev) => ({
      ...prev,
      currentQuestion: questions.length > 0 ? questions[0] : null,
    }))
  }

  const handleContinueAfterWrongAnswer = async () => {
    // Only switch turn if there's a pending turn switch (from wrong answer)
    if (!gameState.pendingTurnSwitch) {
      return
    }

    const nextPlayer = gameState.players.find(p => p.id !== gameState.currentPlayer?.id)
    const nextTurn = nextPlayer?.piece || gameState.currentTurn
    
    setGameState((prev) => ({
      ...prev,
      currentPlayer: nextPlayer || prev.currentPlayer,
      currentTurn: nextTurn,
      canPlacePiece: false,
      pendingTurnSwitch: false,
    }))

    // Sync with server in online mode
    if (gameState.gameMode === "online" && gameState.lobbyId) {
      try {
        await fetch(`/api/lobby/${gameState.lobbyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_turn: nextTurn,
            current_question_index: questions.length > 0 ? (questionIndex + 1) % questions.length : 0,
          }),
        })
      } catch (error) {
        console.error('Error syncing turn switch to server:', error)
      }
    }
    
    // Get next question for the new player
    nextQuestion()
  }

  const completePhysicalPlacement = () => {
    if (gameState.boardMode !== "physical" || !gameState.canPlacePiece) {
      return
    }

    setGameState((prev) => {
      const nextTurn = prev.currentTurn === "X" ? "O" : "X"
      const nextPlayer = prev.players.find((p) => p.piece === nextTurn) || prev.currentPlayer

      return {
        ...prev,
        currentTurn: nextTurn,
        currentPlayer: nextPlayer || prev.currentPlayer,
        canPlacePiece: false,
        pendingTurnSwitch: false,
      }
    })

    nextQuestion()
  }

  const nextQuestion = () => {
    if (questions.length === 0) return
    
    // Find next unused question
    let nextQuestion: Question | null = null
    let attempts = 0
    const maxAttempts = questions.length
    
    // If all questions have been used, reset the used set
    if (usedQuestionIds.size >= questions.length) {
      setUsedQuestionIds(new Set())
    }
    
    // Find an unused question
    while (attempts < maxAttempts) {
      const candidateIndex = (questionIndex + 1 + attempts) % questions.length
      const candidate = questions[candidateIndex]
      
      if (!usedQuestionIds.has(candidate.id)) {
        nextQuestion = candidate
        setQuestionIndex(candidateIndex)
        setUsedQuestionIds(prev => new Set(prev).add(candidate.id))
        break
      }
      
      attempts++
    }
    
    // Fallback: if we somehow can't find an unused question, just use the next one
    if (!nextQuestion) {
      const fallbackIndex = (questionIndex + 1) % questions.length
      nextQuestion = questions[fallbackIndex]
      setQuestionIndex(fallbackIndex)
    }
    
    setGameState((prev) => ({
      ...prev,
      currentQuestion: nextQuestion,
    }))
  }

  const updateScore = (playerId: string, points: number) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((player) =>
        player.id === playerId ? { ...player, score: player.score + points } : player,
      ),
      currentPlayer:
        prev.currentPlayer?.id === playerId
          ? { ...prev.currentPlayer, score: prev.currentPlayer.score + points }
          : prev.currentPlayer,
    }))
  }

  const leaveGame = async () => {
    // If in online mode, notify server
    if (gameState.lobbyId && gameState.currentPlayer) {
      try {
        await fetch(`/api/lobby/${gameState.lobbyId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: gameState.currentPlayer.id }),
        })
      } catch (error) {
        console.error('Error leaving lobby:', error)
      }
    }

    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    setGameState({
      currentPlayer: null,
      players: [],
      gameMode: "single",
      currentQuestion: null,
      gameSession: null,
      isGameActive: false,
      board: createEmptyBoard(),
      currentTurn: "X",
      canPlacePiece: false,
      winner: null,
      isGameOver: false,
      lobbyId: null,
      lobbyCode: null,
      isHost: false,
      pendingTurnSwitch: false,
      boardMode: "digital",
    })
    setQuestionIndex(0)
    setUsedQuestionIds(new Set()) // Clear used questions when leaving game
  }

  const createLobby = async (userId: string, userName: string): Promise<{lobbyCode: string, lobbyId: string} | null> => {
    try {
      const response = await fetch('/api/lobby/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Failed to create lobby', {
          description: error.error || 'Please try again',
        })
        return null
      }

      const { lobby } = await response.json()

      // Set up host as player 1
      const player1: Player = {
        id: userId,
        name: userName,
        score: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
        isOnline: true,
        piece: "X",
      }

      setGameState((prev) => ({
        ...prev,
        currentPlayer: player1,
        players: [player1],
        gameMode: "online",
        lobbyId: lobby.id,
        lobbyCode: lobby.lobby_code,
        isHost: true,
        isGameActive: false, // Wait for second player
        currentQuestion: questions.length > 0 ? questions[0] : null,
      }))

      // Start polling for lobby updates
      console.log('Starting polling for lobby:', lobby.id);
      startPolling(lobby.id)

      return {
        lobbyCode: lobby.lobby_code,
        lobbyId: lobby.id,
      }
    } catch (error) {
      console.error('Error creating lobby:', error)
      toast.error('Failed to create lobby')
      return null
    }
  }

  const joinLobby = async (lobbyCode: string, userId: string, userName: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/lobby/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyCode, userId, userName }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Failed to join lobby', {
          description: error.error || 'Please check the code and try again',
        })
        return false
      }

      const { lobby } = await response.json()

      // Set up guest as player 2
      const player1: Player = {
        id: lobby.host_user_id,
        name: lobby.host_name,
        score: lobby.host_score || 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${lobby.host_name}`,
        isOnline: true,
        piece: "X",
      }

      const player2: Player = {
        id: userId,
        name: userName,
        score: lobby.guest_score || 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
        isOnline: true,
        piece: "O",
      }

      setGameState((prev) => ({
        ...prev,
        currentPlayer: player2,
        players: [player1, player2],
        gameMode: "online",
        lobbyId: lobby.id,
        lobbyCode: lobby.lobby_code,
        isHost: false,
        isGameActive: lobby.status === 'active', // Don't auto-activate, wait for host
        board: lobby.board_state || createEmptyBoard(),
        currentTurn: lobby.current_turn || "X",
        canPlacePiece: false,
        currentQuestion: questions.length > 0 ? questions[lobby.current_question_index || 0] : null,
      }))

      setQuestionIndex(lobby.current_question_index || 0)

      // Start polling for lobby updates
      startPolling(lobby.id)

      return true
    } catch (error) {
      console.error('Error joining lobby:', error)
      toast.error('Failed to join lobby')
      return false
    }
  }

  const startPolling = (lobbyId: string) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      console.log('Clearing existing polling interval');
      clearInterval(pollingIntervalRef.current)
    }

    console.log('Setting up polling interval for lobby:', lobbyId);
    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling lobby state...');
      syncLobbyState(lobbyId)
    }, 2000)
    
    // Do an immediate sync when starting polling
    syncLobbyState(lobbyId)
  }

  const syncLobbyState = async (lobbyId?: string) => {
    const targetLobbyId = lobbyId || gameState.lobbyId
    if (!targetLobbyId) return

    try {
      const response = await fetch(`/api/lobby/${targetLobbyId}`)
      
      // Check if lobby was deleted (404)
      if (response.status === 404) {
        console.log('Lobby not found (404) - stopping polling')
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        // If game is completed or has a winner, this is expected cleanup
        // Don't reset state - let players see the victory dialog
        if (gameState.isGameOver || gameState.winner) {
          console.log('Game completed, lobby cleanup is normal - keeping victory dialog')
          return
        }
        
        // If game was active but not completed, show error (but don't reset)
        if (gameState.isGameActive) {
          console.log('Game active but lobby deleted - unusual but staying in game')
          toast.error('Connection Lost', {
            description: 'Lost connection to game lobby',
          })
        } else {
          // Otherwise, host left before game started
          toast.error('Lobby Closed', {
            description: 'The host has left the lobby',
          })
          leaveGame()
        }
        return
      }
      
      if (!response.ok) {
        console.error('Failed to sync lobby:', response.status)
        return
      }

      const { lobby } = await response.json()
      console.log('=== SYNC LOBBY STATE ===')
      console.log('Raw lobby data:', JSON.stringify(lobby, null, 2))
      console.log('Lobby host_user_id:', lobby.host_user_id)
      console.log('Lobby guest_user_id:', lobby.guest_user_id)
      console.log('Lobby host_name:', lobby.host_name)
      console.log('Lobby guest_name:', lobby.guest_name)
      console.log('Lobby status:', lobby.status)

      // Check if lobby was cancelled
      if (lobby.status === 'cancelled') {
        toast.error('Lobby Closed', {
          description: 'The host has left the game',
        })
        leaveGame()
        return
      }

      // Note: Keep polling during 'active' and 'completed' status
      // We need to keep polling even after game completion for play again requests
      // Only stop polling when lobby is deleted (404) or cancelled

      // Update game state from lobby
      setGameState((prev) => {
        console.log('Previous players:', prev.players)
        console.log('Previous players length:', prev.players.length)
        console.log('Is host?', prev.isHost)

        // Always construct players from fresh lobby data to avoid stale information
        const player1 = {
          id: lobby.host_user_id,
          name: lobby.host_name,
          score: lobby.host_score || 0,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${lobby.host_name}`,
          isOnline: true,
          piece: "X" as const,
        }

        const player2 = lobby.guest_user_id ? {
          id: lobby.guest_user_id,
          name: lobby.guest_name,
          score: lobby.guest_score || 0,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${lobby.guest_name}`,
          isOnline: true,
          piece: "O" as const,
        } : null

        console.log('Constructed player1:', player1)
        console.log('Constructed player2:', player2)

        const players = player2 ? [player1, player2] : [player1]
        console.log('Final players array:', players)
        console.log('Final players length:', players.length)

        // If we're host and guest just joined, show notification
        const guestJustJoined = prev.isHost && prev.players.length === 1 && player2

        if (guestJustJoined) {
          console.log('Guest just joined!', lobby.guest_name)
          toast.info('Player Joined!', {
            description: `${lobby.guest_name} has joined the game`,
          })
        }

        // Log player update
        console.log('Updating state with players:', players)

        // Determine currentPlayer based on current_turn, not on who the user is
        const currentTurn = lobby.current_turn || prev.currentTurn
        const currentPlayer = players.find(p => p.piece === currentTurn) || player1

        return {
          ...prev,
          players,
          isGameActive: lobby.status === 'active',
          board: lobby.board_state || prev.board,
          currentTurn,
          canPlacePiece: prev.isHost ? lobby.host_can_place : lobby.guest_can_place,
          currentPlayer,
          winner: lobby.winner_id ? players.find(p => p.id === lobby.winner_id) || null : null,
          isGameOver: lobby.status === 'completed',
        }
      })

      // Update question index if changed
      if (lobby.current_question_index !== questionIndex) {
        setQuestionIndex(lobby.current_question_index)
        setGameState((prev) => ({
          ...prev,
          currentQuestion: questions.length > 0 ? questions[lobby.current_question_index] : null,
        }))
      }
    } catch (error) {
      console.error('Error syncing lobby state:', error)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  return (
    <GameContext.Provider
      value={{
        gameState,
        joinGame,
        scanQRCode,
        answerQuestion,
        nextQuestion,
        updateScore,
        leaveGame,
        placePiece,
        resetBoard,
        addSecondPlayer,
        createLobby,
        joinLobby,
        syncLobbyState,
        handleContinueAfterWrongAnswer,
        completePhysicalPlacement,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
