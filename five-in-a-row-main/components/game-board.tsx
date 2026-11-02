"use client"

import { useGame } from "./game-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Grid3x3, Trophy, RotateCcw, User } from "lucide-react"

export function GameBoard() {
  const { gameState, placePiece, resetBoard } = useGame()

  const handleCellClick = (row: number, col: number) => {
    if (gameState.canPlacePiece && !gameState.isGameOver) {
      placePiece(row, col)
    }
  }

  const getCellStyle = (cell: "X" | "O" | null) => {
    if (cell === "X") {
      return "bg-primary/20 border-primary text-primary glow-primary"
    } else if (cell === "O") {
      return "bg-accent/20 border-accent text-accent glow-accent"
    }
    return "bg-muted/30 border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5"
  }

  return (
    <Card className="cyber-border glow-primary h-full lg:h-full max-h-[500px] lg:max-h-none flex flex-col overflow-hidden">
      <CardContent className="p-3 flex-1 overflow-y-auto">
        {/* Player Status - Moved to Top */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`cyber-border p-2 rounded-lg ${
                gameState.currentPlayer?.id === player.id
                  ? "border-2 border-primary bg-primary/10 glow-primary"
                  : "border-muted-foreground/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg font-mono ${
                    player.piece === "X"
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-accent/20 text-accent border-2 border-accent"
                  }`}
                >
                  {player.piece}
                </div>
                <div className="flex-1">
                  <div className="font-mono font-bold text-base text-card-foreground">{player.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    SCORE: <span className={player.piece === "X" ? "text-primary" : "text-accent"}>{player.score}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {gameState.isGameOver && gameState.winner && (
          <div className="mb-3 cyber-border p-2.5 rounded-lg bg-accent/10 border-accent/40 glow-accent">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-accent" />
                <div>
                  <div className="font-bold text-base font-mono text-accent">VICTORY.ACHIEVED</div>
                  <div className="text-accent/80 font-mono text-xs">
                    {gameState.winner.name} ({gameState.winner.piece}) WINS!
                  </div>
                </div>
              </div>
              <Button onClick={resetBoard} variant="outline" size="sm" className="cyber-border font-mono bg-transparent text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                RESET
              </Button>
            </div>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between text-xs font-mono">
          <div className="text-muted-foreground">
            TURN:{" "}
            <span className={gameState.currentTurn === "X" ? "text-primary font-semibold" : "text-accent font-semibold"}>
              {gameState.currentTurn}
            </span>
          </div>
          <div>
            {gameState.canPlacePiece ? (
              <span className="text-accent">✓ PLACE</span>
            ) : (
              <span className="text-destructive">⚠ ANSWER</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-15 gap-px p-1.5 cyber-border rounded-lg bg-background/50">
          {gameState.board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                disabled={!gameState.canPlacePiece || cell !== null || gameState.isGameOver}
                className={`
                  aspect-square rounded-sm border transition-all font-bold text-xs font-mono
                  disabled:cursor-not-allowed
                  ${getCellStyle(cell)}
                  ${gameState.canPlacePiece && cell === null && !gameState.isGameOver ? "cursor-pointer" : ""}
                `}
              >
                {cell}
              </button>
            )),
          )}
        </div>
      </CardContent>
    </Card>
  )
}
