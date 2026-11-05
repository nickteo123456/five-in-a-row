import { describe, expect, it } from 'vitest'
import { chooseComputerMove } from '@/lib/game/ai'
import { createEmptyBoard, placeOnBoard } from '@/lib/game/board'
import type { Board, Piece } from '@/types/game'

function place(board: Board, cells: [number, number][], piece: Piece): Board {
  return cells.reduce((next, [row, col]) => placeOnBoard(next, { row, col }, piece), board)
}

describe('chooseComputerMove', () => {
  it('opens in the centre', () => {
    expect(chooseComputerMove(createEmptyBoard(), 'O')).toEqual({ row: 7, col: 7 })
  })

  it('blocks a player who is one move from winning', () => {
    const board = place(
      createEmptyBoard(),
      [
        [7, 3],
        [7, 4],
        [7, 5],
        [7, 6],
      ],
      'X'
    )
    const blocked = place(board, [[7, 2]], 'O')

    expect(chooseComputerMove(blocked, 'O')).toEqual({ row: 7, col: 7 })
  })

  it('takes a win instead of blocking', () => {
    let board = place(
      createEmptyBoard(),
      [
        [2, 2],
        [2, 3],
        [2, 4],
        [2, 5],
      ],
      'O'
    )
    board = place(
      board,
      [
        [9, 2],
        [9, 3],
        [9, 4],
        [9, 5],
      ],
      'X'
    )

    const move = chooseComputerMove(board, 'O')

    expect(move?.row).toBe(2)
    expect([1, 6]).toContain(move?.col)
  })

  it('never picks an occupied cell', () => {
    const board = place(createEmptyBoard(), [[7, 7]], 'X')
    const move = chooseComputerMove(board, 'O')!

    expect(board[move.row][move.col]).toBeNull()
  })
})
