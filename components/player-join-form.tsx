"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, UserPlus } from "lucide-react"
import { useGame } from "./game-provider"

interface PlayerJoinFormProps {
  onClose: () => void
  boardMode: "digital" | "physical"
}

export function PlayerJoinForm({ onClose, boardMode }: PlayerJoinFormProps) {
  const [player1Name, setPlayer1Name] = useState("")
  const [player2Name, setPlayer2Name] = useState("")
  const { joinGame } = useGame()

  const isPhysicalMode = boardMode === "physical"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (player1Name.trim() && player2Name.trim()) {
      // Join game with both players for local multiplayer
      joinGame(player1Name.trim(), "multiplayer", player2Name.trim(), boardMode)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md cyber-border glow-primary">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="font-mono text-primary">
              {isPhysicalMode ? "PHYSICAL.MATCH.SETUP" : "NEURAL.INTERFACE.INIT"}
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-muted-foreground">
            {">"} Configure player parameters for Five in a Row battle
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="player1Name" className="font-mono text-primary">
              PLAYER.1 (X)
            </Label>
            <Input
              id="player1Name"
              placeholder="Enter Player 1 identifier..."
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              required
              className="cyber-border font-mono bg-input/50 focus:glow-primary"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="player2Name" className="font-mono text-accent">
              PLAYER.2 (O)
            </Label>
            <Input
              id="player2Name"
              placeholder="Enter Player 2 identifier..."
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              required
              className="cyber-border font-mono bg-input/50 focus:glow-accent"
            />
          </div>

          <div className="cyber-border p-4 rounded-xl bg-secondary/5">
            <div className="flex items-start gap-3">
              <UserPlus className="h-5 w-5 text-secondary mt-0.5" />
              <div className="text-sm font-mono">
                <div className="text-secondary mb-1">GAME.RULES</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>{">"} Player 1 starts first (X piece)</li>
                  <li>
                    {">"} Answer question correctly to place your piece
                    {isPhysicalMode ? " on the physical board" : ""}
                  </li>
                  <li>{">"} Wrong answer? Turn switches to other player!</li>
                  <li>
                    {">"} Get 5 in a row to win
                    {isPhysicalMode ? " on your real board" : " (any direction)"}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 glow-primary font-mono">
              START.GAME
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 font-mono bg-transparent"
            >
              ABORT
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
