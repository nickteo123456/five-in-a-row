import type { Board, CellPosition, Piece } from '@/types/game'
import { BOARD_SIZE, isInsideBoard, nextPiece } from './board'

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const

const CENTER = Math.floor(BOARD_SIZE / 2)
const SEARCH_RADIUS = 2

function countSide(
  board: Board,
  { row, col }: CellPosition,
  rowStep: number,
  colStep: number,
  piece: Piece
) {
  let count = 0

  for (let distance = 1; distance < 5; distance++) {
    const nextRow = row + rowStep * distance
    const nextCol = col + colStep * distance

    if (!isInsideBoard(nextRow, nextCol)) return { count, isOpen: false }
    if (board[nextRow][nextCol] === null) return { count, isOpen: true }
    if (board[nextRow][nextCol] !== piece) return { count, isOpen: false }
    count++
  }

  return { count, isOpen: false }
}

function scoreLine(length: number, openEnds: number): number {
  if (length >= 5) return 100000
  if (openEnds === 0) return 0
  if (length === 4) return openEnds === 2 ? 10000 : 1000
  if (length === 3) return openEnds === 2 ? 1000 : 100
  if (length === 2) return openEnds === 2 ? 100 : 10
  return openEnds
}

function scoreMove(board: Board, move: CellPosition, piece: Piece): number {
  return DIRECTIONS.reduce((total, [rowStep, colStep]) => {
    const forward = countSide(board, move, rowStep, colStep, piece)
    const backward = countSide(board, move, -rowStep, -colStep, piece)
    const length = forward.count + backward.count + 1
    const openEnds = Number(forward.isOpen) + Number(backward.isOpen)

    return total + scoreLine(length, openEnds)
  }, 0)
}

function isNearPiece(board: Board, { row, col }: CellPosition): boolean {
  for (let r = row - SEARCH_RADIUS; r <= row + SEARCH_RADIUS; r++) {
    for (let c = col - SEARCH_RADIUS; c <= col + SEARCH_RADIUS; c++) {
      if (isInsideBoard(r, c) && board[r][c] !== null) return true
    }
  }

  return false
}

// Picks the cell that best builds the computer's line or blocks the player's.
// Attack scores slightly higher, so it finishes a win rather than blocking.
export function chooseComputerMove(board: Board, piece: Piece): CellPosition | null {
  const opponent = nextPiece(piece)
  let bestMove: CellPosition | null = null
  let bestScore = -1
  let hasPieces = false

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null) {
        hasPieces = true
        continue
      }

      const move = { row, col }
      if (!isNearPiece(board, move)) continue

      const score = scoreMove(board, move, piece) * 1.1 + scoreMove(board, move, opponent)
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    }
  }

  if (!hasPieces) return { row: CENTER, col: CENTER }

  return bestMove
}
