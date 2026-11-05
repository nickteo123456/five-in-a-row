'use client'

import type React from 'react'
import { useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BOARD_SIZE } from '@/lib/game/board'
import type { CellPosition, Player } from '@/types/game'
import { useAuth } from './auth-provider'
import { useGame } from './game-provider'
import { useI18n } from './i18n-provider'

const ARROW_STEPS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

const isSameCell = (a: CellPosition | null, b: CellPosition) => a?.row === b.row && a?.col === b.col

function PlayerCard({ player, isActive }: { player: Player; isActive: boolean }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const pieceColor = player.piece === 'X' ? 'text-primary' : 'text-accent'

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border min-w-0 transition ${
        isActive ? 'border-primary bg-primary/15 glow-primary' : 'border-border opacity-70'
      }`}
    >
      <div
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold font-mono border-2 border-current ${pieceColor}`}
      >
        {player.piece}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">
          {player.name}
          {player.id === user?.id && (
            <span className="text-muted-foreground font-normal"> ({t('common.you')})</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {t('game.score')}: <span className={pieceColor}>{player.score}</span>
          {!player.isOnline && <span className="ml-1.5 text-destructive">{t('game.offline')}</span>}
        </div>
      </div>
    </div>
  )
}

export function PlayerCards() {
  const { gameState } = useGame()

  return (
    <div className="grid grid-cols-2 gap-2">
      {gameState.players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isActive={gameState.currentPlayer?.id === player.id && !gameState.isGameOver}
        />
      ))}
    </div>
  )
}

export function GameBoard() {
  const { t } = useI18n()
  const { gameState, placePiece } = useGame()
  const { board, canPlacePiece, isGameOver, winningLine, lastMove, isComputerThinking } = gameState
  const [isZoomed, setIsZoomed] = useState(false)
  const [pendingCell, setPendingCell] = useState<CellPosition | null>(null)
  const [focusedCell, setFocusedCell] = useState<CellPosition>({ row: 7, col: 7 })
  const gridRef = useRef<HTMLDivElement>(null)

  const handleCellClick = (cell: CellPosition) => {
    if (!canPlacePiece || isGameOver || board[cell.row][cell.col] !== null) return

    // Cells are small on touch screens, so a tap selects and a second tap confirms
    const needsConfirm = window.matchMedia('(pointer: coarse)').matches
    if (needsConfirm && !isSameCell(pendingCell, cell)) {
      setPendingCell(cell)
      return
    }

    setPendingCell(null)
    placePiece(cell.row, cell.col)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const step = ARROW_STEPS[event.key]
    if (!step) return

    event.preventDefault()
    const row = Math.min(BOARD_SIZE - 1, Math.max(0, focusedCell.row + step[0]))
    const col = Math.min(BOARD_SIZE - 1, Math.max(0, focusedCell.col + step[1]))

    setFocusedCell({ row, col })
    gridRef.current?.querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`)?.focus()
  }

  const status = isComputerThinking
    ? t('game.computerThinking')
    : canPlacePiece
      ? t('game.placeNow')
      : t('game.answerFirst')

  return (
    <div className="space-y-2">
      {!isGameOver && (
        <div className="flex items-center justify-between gap-2 min-h-8">
          <p
            role="status"
            className={`text-sm font-medium flex items-center gap-1.5 ${
              canPlacePiece ? 'text-accent' : 'text-muted-foreground'
            }`}
          >
            {isComputerThinking && <Loader2 className="h-4 w-4 animate-spin" />}
            {pendingCell && canPlacePiece ? t('board.confirmHint') : status}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsZoomed(!isZoomed)}
            aria-label={t(isZoomed ? 'board.zoomOut' : 'board.zoomIn')}
            className="h-8 w-8 lg:hidden shrink-0"
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-border bg-background/60 p-1">
        <div
          ref={gridRef}
          role="grid"
          aria-label={t('board.label')}
          onKeyDown={handleKeyDown}
          className="grid grid-cols-15 gap-px"
          style={{ width: isZoomed ? '200%' : '100%' }}
        >
          {board.map((cells, row) =>
            cells.map((piece, col) => {
              const cell = { row, col }
              const isPlayable = canPlacePiece && !isGameOver && piece === null

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  data-cell={`${row}-${col}`}
                  data-playable={isPlayable}
                  data-pending={isSameCell(pendingCell, cell)}
                  data-last={isSameCell(lastMove, cell)}
                  data-winning={winningLine?.some((line) => isSameCell(line, cell)) ?? false}
                  tabIndex={isSameCell(focusedCell, cell) ? 0 : -1}
                  aria-disabled={!isPlayable}
                  aria-label={t('board.cell', {
                    row: row + 1,
                    col: col + 1,
                    state: piece ?? t('board.empty'),
                  })}
                  onClick={() => handleCellClick(cell)}
                  onFocus={() => setFocusedCell(cell)}
                  className={`board-cell aspect-square rounded-[2px] flex items-center justify-center font-mono font-bold text-[clamp(0.6rem,2.4vw,0.95rem)] leading-none focus-visible:outline-2 focus-visible:outline-primary ${
                    piece === 'X' ? 'text-primary' : 'text-accent'
                  } ${isPlayable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {piece}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
