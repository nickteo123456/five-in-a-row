import type { Board, CellPosition, Piece } from '@/types/game'

export const BOARD_SIZE = 15
export const WINNING_LENGTH = 5

const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal \
  [1, -1], // diagonal /
] as const

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
}

export function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function nextPiece(piece: Piece): Piece {
  return piece === 'X' ? 'O' : 'X'
}

export function placeOnBoard(board: Board, { row, col }: CellPosition, piece: Piece): Board {
  const nextBoard = board.map((cells) => [...cells])
  nextBoard[row][col] = piece
  return nextBoard
}

export function isBoardFull(board: Board): boolean {
  return board.every((cells) => cells.every((cell) => cell !== null))
}

function collectLine(
  board: Board,
  { row, col }: CellPosition,
  [rowStep, colStep]: readonly [number, number],
  piece: Piece
): CellPosition[] {
  const cells: CellPosition[] = []

  for (let distance = 1; ; distance++) {
    const nextRow = row + rowStep * distance
    const nextCol = col + colStep * distance
    if (!isInsideBoard(nextRow, nextCol) || board[nextRow][nextCol] !== piece) return cells
    cells.push({ row: nextRow, col: nextCol })
  }
}

// Returns every cell of the line through this move, or null when it doesn't
// win. Five or more in a row wins (free-style Gomoku, so overlines count).
export function findWinningLine(
  board: Board,
  move: CellPosition,
  piece: Piece
): CellPosition[] | null {
  for (const direction of DIRECTIONS) {
    const forward = collectLine(board, move, direction, piece)
    const backward = collectLine(board, move, [-direction[0], -direction[1]], piece)
    const line = [...backward.reverse(), move, ...forward]

    if (line.length >= WINNING_LENGTH) return line
  }

  return null
}

export function checkWinner(board: Board, move: CellPosition, piece: Piece): boolean {
  return findWinningLine(board, move, piece) !== null
}

// Finds a winning line anywhere on the board, for clients that only receive the
// finished board from the server.
export function findAnyWinningLine(board: Board): CellPosition[] | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      const line = piece ? findWinningLine(board, { row, col }, piece) : null
      if (line) return line
    }
  }

  return null
}

// Returns the single cell that changed between two boards, if there is one.
export function findNewMove(previous: Board, next: Board): CellPosition | null {
  let move: CellPosition | null = null

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (previous[row][col] !== next[row][col]) {
        if (move) return null
        move = { row, col }
      }
    }
  }

  return move
}
