"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, Zap } from "lucide-react"
import { useGame } from "./game-provider"
import { useAuth } from "./auth-provider"

export function Leaderboard() {
  const { gameState } = useGame()
  const { user } = useAuth()

  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score)

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-chart-5" />
      case 1:
        return <Medal className="h-5 w-5 text-muted-foreground" />
      case 2:
        return <Award className="h-5 w-5 text-chart-4" />
      default:
        return <span className="text-sm font-bold text-muted-foreground font-mono">#{index + 1}</span>
    }
  }

  return (
    <Card className="cyber-border glow-secondary">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-secondary" />
          <CardTitle className="font-mono text-secondary">NEURAL.RANKINGS</CardTitle>
        </div>
        <CardDescription className="font-mono">
          {gameState.gameMode === "multiplayer" ? "Live combat rankings" : "Personal progress matrix"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedPlayers.length === 0 ? (
          <div className="text-center py-8">
            <div className="cyber-border p-6 rounded-xl">
              <p className="text-muted-foreground font-mono">
                {">"} No neural patterns detected.
                <br />
                {">"} Initialize quest to populate rankings...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`cyber-border p-4 rounded-xl transition-all duration-300 ${
                  player.id === user?.id
                    ? "glow-primary border-primary/40 bg-primary/5"
                    : "hover:border-accent/30 hover:bg-accent/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 cyber-border rounded-lg">
                    {getRankIcon(index)}
                  </div>

                  <Avatar className="h-10 w-10 border-2 border-primary/30">
                    <AvatarImage src={player.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-mono">{player.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-primary truncate">{player.name}</span>
                      {player.id === user?.id && (
                        <Badge variant="outline" className="text-xs font-mono border-accent/30 text-accent">
                          YOU
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {player.score} <span className="text-xs">PTS</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        player.isOnline ? "bg-accent glow-accent" : "bg-muted-foreground"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {player.isOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
