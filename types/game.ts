export type Piece = 'X' | 'O'
export type BoardCell = Piece | null
export type Board = BoardCell[][]
export type BoardMode = 'digital' | 'physical'
export type GameMode = 'single' | 'multiplayer' | 'online'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Answer = string | number

export interface CellPosition {
  row: number
  col: number
}

export interface Player {
  id: string
  name: string
  score: number
  isOnline: boolean
  piece: Piece
  isComputer?: boolean
}

export interface Question {
  id: string
  type: 'multiple-choice' | 'code-completion' | 'true-false'
  question: string
  code?: string
  options?: string[]
  correctAnswer: Answer
  explanation: string
  difficulty: Difficulty
  topic: string
}

// A question row as stored in the database
export interface DbQuestion {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: number
  explanation: string
  difficulty: Difficulty
  topic: string
}

export interface QuestionFilter {
  difficulty: Difficulty | 'all'
  topic: string | 'all'
}

export interface MissedQuestion {
  playerId: string
  question: Question
}

export interface AnswerTally {
  answered: number
  correct: number
}

export interface GameSetup {
  mode: Exclude<GameMode, 'online'>
  boardMode?: BoardMode
  player1Name: string
  player2Name?: string
  filter?: QuestionFilter
  isTimed?: boolean
}

export interface RematchState {
  isWaiting: boolean
  requesterName: string | null
  rejecterName: string | null
}

export interface GameState {
  currentPlayer: Player | null
  players: Player[]
  gameMode: GameMode
  currentQuestion: Question | null
  isGameActive: boolean
  board: Board
  currentTurn: Piece
  canPlacePiece: boolean
  winner: Player | null
  isDraw: boolean
  isGameOver: boolean
  winningLine: CellPosition[] | null
  lastMove: CellPosition | null
  lobbyId: string | null
  lobbyCode: string | null
  isHost: boolean
  pendingTurnSwitch: boolean
  boardMode: BoardMode
  isComputerThinking: boolean
  questionTimeLimit: number | null
  opponentLeft: boolean
  rematch: RematchState
  missedQuestions: MissedQuestion[]
  tallies: Record<string, AnswerTally>
}

// The lobby fields the client reads from the server
export interface LobbySnapshot {
  id: string
  lobby_code: string
  status: string
  host_user_id: string
  host_name: string | null
  guest_user_id: string | null
  guest_name: string | null
  host_score: number | null
  guest_score: number | null
  host_can_place: boolean
  guest_can_place: boolean
  current_turn: Piece | null
  board_state: Board | null
  current_question_index: number | null
  winner_id: string | null
  play_again_request?: string | null
  play_again_requester_name?: string | null
  play_again_accepted?: boolean | null
  play_again_rejected?: boolean | null
  play_again_rejecter_name?: string | null
  host_online?: boolean
  guest_online?: boolean
}
