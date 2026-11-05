import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  checkWinner,
  createEmptyBoard,
  findAnyWinningLine,
  findNewMove,
  findWinningLine,
  isBoardFull,
  nextPiece,
  placeOnBoard,
} from '@/lib/game/board'
import type { Board, Piece } from '@/types/game'

function boardWith(cells: [number, number][], piece: Piece = 'X'): Board {
  return cells.reduce(
    (board, [row, col]) => placeOnBoard(board, { row, col }, piece),
    createEmptyBoard()
  )
}

const line = (startRow: number, startCol: number, rowStep: number, colStep: number, length = 5) =>
  Array.from({ length }, (_, i): [number, number] => [
    startRow + rowStep * i,
    startCol + colStep * i,
  ])

describe('createEmptyBoard', () => {
  it('creates a 15x15 board of empty cells', () => {
    const board = createEmptyBoard()

    expect(board).toHaveLength(BOARD_SIZE)
    expect(board.every((row) => row.length === BOARD_SIZE)).toBe(true)
    expect(board.flat().every((cell) => cell === null)).toBe(true)
  })
})

describe('placeOnBoard', () => {
  it('returns a new board and leaves the original alone', () => {
    const board = createEmptyBoard()
    const next = placeOnBoard(board, { row: 1, col: 2 }, 'O')

    expect(next[1][2]).toBe('O')
    expect(board[1][2]).toBeNull()
  })
})

describe('nextPiece', () => {
  it('alternates between X and O', () => {
    expect(nextPiece('X')).toBe('O')
    expect(nextPiece('O')).toBe('X')
  })
})

describe('checkWinner', () => {
  it.each([
    ['horizontal', line(7, 3, 0, 1)],
    ['vertical', line(3, 7, 1, 0)],
    ['diagonal \\', line(3, 3, 1, 1)],
    ['diagonal /', line(3, 11, 1, -1)],
  ])('detects a %s win', (_, cells) => {
    const board = boardWith(cells)

    for (const [row, col] of cells) {
      expect(checkWinner(board, { row, col }, 'X')).toBe(true)
    }
  })

  it('does not count four in a row', () => {
    const cells = line(7, 3, 0, 1, 4)
    expect(checkWinner(boardWith(cells), { row: 7, col: 3 }, 'X')).toBe(false)
  })

  it('counts six or more in a row as a win (free-style rule)', () => {
    const cells = line(7, 3, 0, 1, 6)
    expect(findWinningLine(boardWith(cells), { row: 7, col: 5 }, 'X')).toHaveLength(6)
  })

  it('wins when the last piece fills a gap in the middle', () => {
    const board = boardWith([
      [7, 3],
      [7, 4],
      [7, 6],
      [7, 7],
      [7, 5],
    ])

    expect(checkWinner(board, { row: 7, col: 5 }, 'X')).toBe(true)
  })

  it.each([
    ['top edge', line(0, 0, 0, 1)],
    ['bottom edge', line(14, 10, 0, 1)],
    ['left edge', line(0, 0, 1, 0)],
    ['right edge', line(10, 14, 1, 0)],
    ['corner diagonal', line(10, 10, 1, 1)],
  ])('detects a win along the %s', (_, cells) => {
    const [row, col] = cells[4]
    expect(checkWinner(boardWith(cells), { row, col }, 'X')).toBe(true)
  })

  it('does not wrap around the edge of the board', () => {
    const board = boardWith([
      [7, 12],
      [7, 13],
      [7, 14],
      [8, 0],
      [8, 1],
    ])

    expect(checkWinner(board, { row: 7, col: 14 }, 'X')).toBe(false)
  })

  it('is not fooled by the other player sitting in the line', () => {
    const board = placeOnBoard(boardWith(line(7, 3, 0, 1, 4)), { row: 7, col: 7 }, 'O')

    expect(checkWinner(board, { row: 7, col: 7 }, 'O')).toBe(false)
    expect(checkWinner(board, { row: 7, col: 6 }, 'X')).toBe(false)
  })
})

describe('findAnyWinningLine', () => {
  it('finds a winner anywhere on the board', () => {
    expect(findAnyWinningLine(boardWith(line(2, 2, 1, 1)))).toHaveLength(5)
  })

  it('returns null when nobody has won', () => {
    expect(findAnyWinningLine(boardWith(line(2, 2, 1, 1, 4)))).toBeNull()
  })
})

describe('isBoardFull', () => {
  it('detects a full board with no winner', () => {
    // A pattern with no five in a row in any direction
    const board: Board = createEmptyBoard().map((cells, row) =>
      cells.map((_, col) => ((Math.floor(col / 2) + row * 2 + (row % 2)) % 2 === 0 ? 'X' : 'O'))
    )

    expect(isBoardFull(board)).toBe(true)
    expect(findAnyWinningLine(board)).toBeNull()
  })

  it('is false while a cell is empty', () => {
    expect(isBoardFull(boardWith([[0, 0]]))).toBe(false)
  })
})

describe('findNewMove', () => {
  it('finds the single new piece', () => {
    expect(findNewMove(createEmptyBoard(), boardWith([[3, 4]]))).toEqual({ row: 3, col: 4 })
  })

  it('returns null when several cells changed', () => {
    const next = boardWith([
      [3, 4],
      [5, 6],
    ])

    expect(findNewMove(createEmptyBoard(), next)).toBeNull()
  })
})
