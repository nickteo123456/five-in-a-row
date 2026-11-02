"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trophy, Users, QrCode, Play, BookOpen, Target, Zap, Code, Terminal, Cpu, Database, LayoutDashboard, Home, RotateCcw, Globe } from "lucide-react"
import { useGame } from "./game-provider"
import { useAuth } from "./auth-provider"
import { PlayerJoinForm } from "./player-join-form"
import { LobbyDialog } from "./lobby-dialog"
import { QuizInterface } from "./quiz-interface"
import { QRScanner } from "./qr-scanner"
import { Leaderboard } from "./leaderboard"
import { GameBoard } from "./game-board"
import { toast } from "sonner"

export function GameDashboard() {
  const { gameState, resetBoard, leaveGame } = useGame()
  const { user, isGuest } = useAuth()
  const [localGameConfig, setLocalGameConfig] = useState<{ boardMode: "digital" | "physical" } | null>(null)
  const [showLobbyDialog, setShowLobbyDialog] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)
  const [isLeavingLobby, setIsLeavingLobby] = useState(false)
  const [showRankingsPage, setShowRankingsPage] = useState(false)
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const [showOpponentLeftDialog, setShowOpponentLeftDialog] = useState(false)
  const [opponentLeftName, setOpponentLeftName] = useState("")
  const [showPlayAgainRequest, setShowPlayAgainRequest] = useState(false)
  const [playAgainRequesterName, setPlayAgainRequesterName] = useState("")
  const [showWaitingForOpponent, setShowWaitingForOpponent] = useState(false)
  const [showPlayAgainRejected, setShowPlayAgainRejected] = useState(false)
  const [rejectorName, setRejectorName] = useState("")
  const router = useRouter()
  const isPhysicalLocalGame = gameState.gameMode === "multiplayer" && gameState.boardMode === "physical"

  const handleLocalMultiplayer = (boardMode: "digital" | "physical") => {
    toast.warning('⚠️ Local Game Mode', {
      description:
        boardMode === "physical"
          ? 'This is a physical board session. Progress won\'t be saved to the database and match history won\'t be recorded.'
          : 'This is a local game. Progress won\'t be saved to the database and match history won\'t be recorded.',
      duration: 5000,
    })
    setTimeout(() => {
      setLocalGameConfig({ boardMode })
    }, 500)
  }

  // Poll for online game events (opponent left, play again requests, etc.)
  useEffect(() => {
    if (gameState.gameMode !== "online" || !gameState.lobbyId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/lobby/${gameState.lobbyId}`)
        
        // Check if lobby was deleted
        if (response.status === 404) {
          clearInterval(pollInterval)
          if (!isLeavingLobby) {
            const opponent = gameState.players.find(p => p.id !== (gameState.currentPlayer?.id || user?.id))
            setOpponentLeftName(opponent?.name || "Opponent")
            setShowOpponentLeftDialog(true)
          }
          return
        }

        if (!response.ok) return

        const { lobby } = await response.json()

        // Get current user's ID (prefer user.id over currentPlayer.id)
        const myId = user?.id || gameState.currentPlayer?.id

        // Check for play again request - if there's a request and it's NOT from me
        if (lobby.play_again_request && lobby.play_again_request !== myId && !showPlayAgainRequest) {
          setPlayAgainRequesterName(lobby.play_again_requester_name || "Opponent")
          setShowPlayAgainRequest(true)
        }

        // Check if play again was accepted
        if (lobby.play_again_accepted && showWaitingForOpponent) {
          setShowWaitingForOpponent(false)
          await resetBoard()
          setShowRankingsPage(false)
          // Clear the flags
          await fetch(`/api/lobby/${gameState.lobbyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              play_again_accepted: false,
            }),
          })
        }

        // Check if play again was rejected
        if (lobby.play_again_rejected && showWaitingForOpponent) {
          setShowWaitingForOpponent(false)
          setRejectorName(lobby.play_again_rejecter_name || "Opponent")
          setShowPlayAgainRejected(true)
        }

      } catch (error) {
        console.error('Error polling lobby:', error)
      }
    }, 1500) // Poll every 1.5 seconds for faster response

    return () => clearInterval(pollInterval)
  }, [gameState.gameMode, gameState.lobbyId, user?.id, gameState.currentPlayer?.id, isLeavingLobby, showWaitingForOpponent, showPlayAgainRequest, resetBoard, gameState.players])

  // Check if returning from lobby
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const leavingLobby = localStorage.getItem('isLeavingLobby')
      if (leavingLobby === 'true') {
        setIsLeavingLobby(true)
        localStorage.removeItem('isLeavingLobby')
        // Clear the leaving screen after a short delay
        setTimeout(() => {
          setIsLeavingLobby(false)
        }, 1000)
      }
    }
  }, [])

  // Show creating lobby screen
  if (isCreatingLobby) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <Globe className="h-24 w-24 text-primary animate-pulse mx-auto mb-4" />
          </div>
          <h1 className="text-4xl font-bold font-mono text-primary mb-4">CREATING.LOBBY...</h1>
          <p className="text-muted-foreground font-mono text-lg">Initializing multiplayer session</p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // Show leaving lobby screen
  if (isLeavingLobby) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <Home className="h-24 w-24 text-accent animate-pulse mx-auto mb-4" />
          </div>
          <h1 className="text-4xl font-bold font-mono text-accent mb-4">RETURNING.TO.MAIN...</h1>
          <p className="text-muted-foreground font-mono text-lg">Leaving multiplayer session</p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="h-2 w-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // Don't redirect to main menu if game is over with a winner (show dialog instead)
  if (!gameState.currentPlayer && !(gameState.isGameOver && gameState.winner)) {
    return (
      <div className="min-h-screen cyber-grid">
        {/* Floating X and O background */}
        <div className="floating-xo-bg">
          {[...Array(12)].map((_, i) => {
            const animations = ['floatRandom1', 'floatRandom2', 'floatRandom3', 'floatRandom4'];
            const randomAnim = animations[i % 4];
            const randomLeft = Math.random() * 100;
            const randomDuration = 15 + Math.random() * 15; // 15-30 seconds
            const randomDelay = Math.random() * 10; // 0-10 seconds
            const randomSize = 80 + Math.random() * 80; // 80-160px
            
            return (
              <div
                key={`symbol-${i}`}
                className={`floating-symbol ${i % 2 === 0 ? 'x' : 'o'}`}
                style={{
                  left: `${randomLeft}%`,
                  fontSize: `${randomSize}px`,
                  animation: `${randomAnim} ${randomDuration}s linear infinite`,
                  animationDelay: `${randomDelay}s`,
                }}
              >
                {i % 2 === 0 ? 'X' : 'O'}
              </div>
            );
          })}
        </div>

        {user && !isGuest && (
          <div className="absolute top-6 right-6 z-50">
            <Button
              onClick={() => router.push(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')}
              className="cyber-border bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 hover:border-primary/50 gap-2 font-mono backdrop-blur-sm glow-primary"
            >
              <LayoutDashboard className="h-4 w-4" />
              {user.role === 'teacher' ? 'Teacher Dashboard' : 'My Dashboard'}
            </Button>
          </div>
        )}
        <div className="relative z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
                  <Terminal className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent text-glow whitespace-nowrap">
                  Connect Five: Python Edition
                </h1>
              </div>
              <p className="text-xl text-muted-foreground mb-4 font-mono">
                {">"} Where Python Mastery Meets Classic Strategy...
              </p>
              <p className="text-lg text-card-foreground max-w-2xl mx-auto">
                Master Python Functions through Advanced Hybrid Gaming Technology
              </p>
            </div>

            <div className="flex flex-col gap-6 justify-center items-center flex-wrap mt-12 w-full">
              <Button
                size="lg"
                onClick={() => handleLocalMultiplayer("digital")}
                className="bg-primary hover:bg-primary/90 glow-primary pulse-glow font-mono w-full max-w-md"
              >
                <Users className="mr-3 h-6 w-6" />
                LOCAL.MULTIPLAYER · WITH BOARD
              </Button>
              <Button
                size="lg"
                onClick={() => handleLocalMultiplayer("physical")}
                className="bg-accent hover:bg-accent/90 glow-accent font-mono w-full max-w-md"
              >
                <Users className="mr-3 h-6 w-6" />
                LOCAL.MULTIPLAYER · WITHOUT BOARD
              </Button>
              {!isGuest && (
                <Button
                  size="lg"
                  onClick={() => setShowLobbyDialog(true)}
                  className="bg-accent hover:bg-accent/90 glow-accent font-mono w-full max-w-md"
                >
                  <Globe className="mr-3 h-6 w-6" />
                  ONLINE.MULTIPLAYER
                </Button>
              )}
            </div>
          </div>
        </div>

        {localGameConfig && (
          <PlayerJoinForm
            boardMode={localGameConfig.boardMode}
            onClose={() => setLocalGameConfig(null)}
          />
        )}
        {showLobbyDialog && <LobbyDialog onClose={() => setShowLobbyDialog(false)} onCreatingLobby={setIsCreatingLobby} />}
        {showQRScanner && <QRScanner onClose={() => setShowQRScanner(false)} />}
      </div>
    )
  }

  // Show game screen during active game OR when game is over with winner (for dialog)
  if (gameState.isGameActive || (gameState.isGameOver && gameState.winner && !showRankingsPage)) {
    return (
      <div className="h-screen cyber-grid overflow-y-auto">
        {/* Leave Room Button for Both Local and Online Games - Bottom Right */}
        {(((gameState.gameMode === "multiplayer" && !isPhysicalLocalGame) || gameState.gameMode === "online") && !gameState.isGameOver) && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setShowLeaveConfirmation(true)}
              variant="outline"
              className="cyber-border bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30 hover:border-destructive/50 gap-2 font-mono backdrop-blur-sm shadow-lg"
            >
              <Home className="h-4 w-4" />
              LEAVE.ROOM
            </Button>
          </div>
        )}
        {isPhysicalLocalGame && !gameState.isGameOver && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={async () => {
                setIsLeavingLobby(true)
                await leaveGame()
                setTimeout(() => {
                  setIsLeavingLobby(false)
                  router.push('/')
                }, 500)
              }}
              className="bg-primary hover:bg-primary/90 glow-primary font-mono gap-2"
            >
              <Home className="h-4 w-4" />
              GAME.END
            </Button>
          </div>
        )}
        
        <div className="container mx-auto px-3 py-2 h-full overflow-y-auto">
          {isPhysicalLocalGame ? (
            <div className="max-w-4xl mx-auto flex flex-col gap-4 py-4">
              <div className="cyber-border rounded-2xl border-primary/30 bg-primary/5 backdrop-blur-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <div className="font-mono text-primary text-lg font-semibold">PHYSICAL.BOARD.MODE</div>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary font-mono">
                    OFFLINE.RUN
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className={`cyber-border p-3 rounded-xl ${
                        gameState.currentPlayer?.id === player.id
                          ? "border-primary/60 bg-primary/10 glow-primary"
                          : "border-muted-foreground/20 bg-background/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg font-mono ${
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
                            SCORE:{" "}
                            <span className={player.piece === "X" ? "text-primary" : "text-accent"}>
                              {player.score}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-xs text-muted-foreground mt-4 leading-relaxed">
                  Place your pieces on the physical game board after each correct answer. Use the{" "}
                  <span className="text-primary font-semibold">Game End</span> button when your match is finished.
                </p>
              </div>
              <QuizInterface />
            </div>
          ) : (
            <div className="flex lg:grid lg:grid-cols-2 flex-col lg:flex-row gap-3 min-h-full lg:h-full">
              {/* Game Board - Fixed height on mobile, flexible on desktop */}
              <div className="lg:h-full flex flex-col">
                <GameBoard />
              </div>
              {/* Quiz Interface - Flexible on mobile, fixed height on desktop */}
              <div className="lg:h-full flex flex-col">
                <QuizInterface />
              </div>
            </div>
          )}
        </div>

        {/* Game Over Dialog - Shows for both winner and loser */}
        <Dialog open={gameState.isGameOver && !!gameState.winner && !showRankingsPage} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md cyber-border glow-accent">
            {gameState.winner && (() => {
              // For local multiplayer (guest mode), user might be null, so default to player 1's perspective
              const isWinner = user ? gameState.winner.id === user.id : gameState.winner.piece === "X"
              const myPlayer = user ? gameState.players.find(p => p.id === user.id) : gameState.players[0]
              const loserPlayer = gameState.players.find(p => p.id !== gameState.winner?.id)
              
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-lg ${isWinner ? 'bg-accent/10 border-accent/20' : 'bg-destructive/10 border-destructive/20'} border`}>
                        <Trophy className={`h-8 w-8 ${isWinner ? 'text-accent' : 'text-destructive'}`} />
                      </div>
                      <div>
                        <DialogTitle className={`font-mono text-2xl ${isWinner ? 'text-accent' : 'text-destructive'}`}>
                          {isWinner ? 'VICTORY.ACHIEVED' : 'DEFEAT.RECEIVED'}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-muted-foreground">
                          Neural combat resolved
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className={`cyber-border p-4 rounded-xl text-center ${
                      isWinner 
                        ? 'bg-accent/10 border-accent/40' 
                        : 'bg-destructive/10 border-destructive/40'
                    }`}>
                      <div className={`font-bold text-xl font-mono mb-2 ${isWinner ? 'text-accent' : 'text-destructive'}`}>
                        {gameState.winner.name}
                      </div>
                      <div className="text-muted-foreground font-mono text-sm mb-3">
                        <span className={`text-lg font-bold ${gameState.winner.piece === "X" ? "text-primary" : "text-accent"}`}>
                          {gameState.winner.piece}
                        </span>
                        {" "}wins the battle!
                      </div>
                      <div className="flex items-center justify-center gap-2 font-mono text-sm">
                        <Badge className={`bg-accent/20 text-accent border-accent`}>
                          {gameState.winner.name}: {gameState.winner.score} PTS
                        </Badge>
                        {loserPlayer && (
                          <Badge className={`bg-secondary/20 text-secondary border-secondary`}>
                            {loserPlayer.name}: {loserPlayer.score} PTS
                          </Badge>
                        )}
                      </div>
                    </div>

                    {!isWinner && (
                      <div className="cyber-border p-3 rounded-lg border-secondary/40 bg-secondary/10 text-center">
                        <p className="text-secondary font-mono text-xs">
                          Don't give up! Practice makes perfect.
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        setShowRankingsPage(true)
                      }}
                      className="w-full bg-primary hover:bg-primary/90 glow-primary font-mono"
                    >
                      NEXT
                    </Button>
                  </div>
                </>
              )
            })()}
          </DialogContent>
        </Dialog>

        {/* Leave Confirmation Dialog */}
        <Dialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
          <DialogContent className="sm:max-w-md cyber-border glow-destructive">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-destructive/10 border-destructive/20 border">
                  <Home className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <DialogTitle className="font-mono text-2xl text-destructive">
                    LEAVE.GAME?
                  </DialogTitle>
                  <DialogDescription className="font-mono text-muted-foreground">
                    Confirm exit
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="cyber-border p-4 rounded-xl bg-destructive/10 border-destructive/40 text-center">
                <p className="text-destructive font-mono text-sm">
                  Are you sure you want to leave this game?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowLeaveConfirmation(false)}
                  variant="outline"
                  className="cyber-border font-mono"
                >
                  CANCEL
                </Button>
                <Button
                  onClick={async () => {
                    setShowLeaveConfirmation(false)
                    setIsLeavingLobby(true)
                    await leaveGame()
                    // Use a small delay to show the leaving screen, then navigate
                    setTimeout(() => {
                      setIsLeavingLobby(false)
                      router.push('/')
                    }, 500)
                  }}
                  className="bg-destructive hover:bg-destructive/90 font-mono"
                >
                  LEAVE
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Opponent Left Dialog */}
        <Dialog open={showOpponentLeftDialog} onOpenChange={async (open) => {
          if (!open) {
            setShowOpponentLeftDialog(false)
            setIsLeavingLobby(true)
            await leaveGame()
            setTimeout(() => {
              setIsLeavingLobby(false)
              router.push('/')
            }, 500)
          }
        }}>
          <DialogContent className="sm:max-w-md cyber-border glow-destructive">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-destructive/10 border-destructive/20 border">
                  <Home className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <DialogTitle className="font-mono text-2xl text-destructive">
                    OPPONENT.LEFT
                  </DialogTitle>
                  <DialogDescription className="font-mono text-muted-foreground">
                    Game ended
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="cyber-border p-4 rounded-xl bg-destructive/10 border-destructive/40 text-center">
                <p className="text-destructive font-mono text-sm mb-2">
                  {opponentLeftName} has left the lobby
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  The game has been cancelled
                </p>
              </div>
              <Button
                onClick={async () => {
                  setShowOpponentLeftDialog(false)
                  setIsLeavingLobby(true)
                  await leaveGame()
                  setTimeout(() => {
                    setIsLeavingLobby(false)
                    router.push('/')
                  }, 500)
                }}
                className="w-full bg-primary hover:bg-primary/90 glow-primary font-mono"
              >
                BACK.TO.MENU
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen cyber-grid">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-mono">
              FIVE.IN.A.ROW
            </h1>
            <p className="text-muted-foreground font-mono mt-2">
              {">"} Welcome, <span className="text-primary">{user?.name || gameState.currentPlayer?.name || 'Player'}</span>
            </p>
          </div>
          <div className="flex items-center gap-6">
            {user && !isGuest && (
              <Button
                onClick={() => router.push(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')}
                className="cyber-border bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 hover:border-primary/50 gap-2 font-mono backdrop-blur-sm glow-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            )}
            <div className="cyber-border p-4 rounded-xl">
              <Avatar className="h-12 w-12 border-2 border-primary/30">
                <AvatarImage src={gameState.players.find(p => p.id === user?.id)?.avatar || gameState.currentPlayer?.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/10 text-primary font-mono">
                  {(user?.name || gameState.currentPlayer?.name || 'P')[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary font-mono">
                {gameState.players.find(p => p.id === user?.id)?.score || gameState.currentPlayer?.score || 0}
                <span className="text-sm text-muted-foreground ml-1">PTS</span>
              </div>
              <Badge variant={gameState.gameMode === "multiplayer" ? "default" : "secondary"} className="font-mono">
                {gameState.gameMode.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Leaderboard />
        </div>

        <div className="mt-12 flex gap-6">
          {/* Only show PLAY AGAIN for local multiplayer */}
          {gameState.gameMode !== "online" && (
            <Button
              onClick={async () => {
                // For local multiplayer, just reset
                await resetBoard()
                setShowRankingsPage(false)
              }}
              className="bg-accent hover:bg-accent/90 glow-accent font-mono px-6"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              PLAY.AGAIN
            </Button>
          )}
          <Button
            onClick={async () => {
              setIsLeavingLobby(true)
              await leaveGame()
              setTimeout(() => {
                setIsLeavingLobby(false)
                router.push("/")
              }, 500)
            }}
            variant="outline"
            className="border-secondary/30 hover:border-secondary hover:bg-secondary/10 font-mono px-6 bg-transparent"
          >
            <Home className="mr-2 h-5 w-5" />
            BACK.TO.MAIN.PAGE
          </Button>
        </div>
        
        {/* Play Again Request Dialogs */}
        {/* Waiting for opponent to accept */}
        <Dialog open={showWaitingForOpponent} onOpenChange={(open) => {
          if (!open) {
            // Allow canceling the request
            setShowWaitingForOpponent(false)
            // Clear the request on server
            if (gameState.lobbyId) {
              fetch(`/api/lobby/${gameState.lobbyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  play_again_request: null,
                  play_again_requester_name: null,
                }),
              })
            }
          }
        }}>
          <DialogContent className="sm:max-w-md cyber-border glow-primary">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 border-primary/20 border">
                  <RotateCcw className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div>
                  <DialogTitle className="font-mono text-2xl text-primary">
                    WAITING.FOR.OPPONENT
                  </DialogTitle>
                  <DialogDescription className="font-mono text-muted-foreground">
                    Play again request sent
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="cyber-border p-4 rounded-xl bg-primary/10 border-primary/40 text-center">
                <p className="text-primary font-mono text-sm">
                  Waiting for {gameState.players.find(p => p.id !== (gameState.currentPlayer?.id || user?.id))?.name} to accept...
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Opponent requesting play again */}
        <Dialog open={showPlayAgainRequest} onOpenChange={async (open) => {
          if (!open) {
            // Rejecting by closing
            setShowPlayAgainRequest(false)
            // Send rejection to server
            if (gameState.lobbyId) {
              await fetch(`/api/lobby/${gameState.lobbyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  play_again_request: null,
                  play_again_requester_name: null,
                  play_again_rejected: true,
                  play_again_rejecter_name: gameState.currentPlayer?.name || user?.name,
                }),
              })
              setIsLeavingLobby(true)
              await leaveGame()
              setTimeout(() => {
                setIsLeavingLobby(false)
                router.push('/')
              }, 500)
            }
          }
        }}>
          <DialogContent className="sm:max-w-md cyber-border glow-accent">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-accent/10 border-accent/20 border">
                  <RotateCcw className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <DialogTitle className="font-mono text-2xl text-accent">
                    NEW.BATTLE.REQUEST
                  </DialogTitle>
                  <DialogDescription className="font-mono text-muted-foreground">
                    Your opponent wants a rematch
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="cyber-border p-4 rounded-xl bg-accent/10 border-accent/40 text-center">
                <p className="text-accent font-mono text-sm mb-2">
                  {playAgainRequesterName} has requested a new battle!
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  Do you want to play again?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={async () => {
                    // Accept play again
                    setShowPlayAgainRequest(false)
                    if (gameState.lobbyId) {
                      try {
                        await fetch(`/api/lobby/${gameState.lobbyId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            play_again_request: null,
                            play_again_requester_name: null,
                            play_again_accepted: true,
                          }),
                        })
                        await resetBoard()
                        setShowRankingsPage(false)
                      } catch (error) {
                        console.error('Error accepting play again:', error)
                      }
                    }
                  }}
                  className="bg-accent hover:bg-accent/90 glow-accent font-mono"
                >
                  ACCEPT
                </Button>
                <Button
                  onClick={async () => {
                    // Reject play again
                    setShowPlayAgainRequest(false)
                    if (gameState.lobbyId) {
                      try {
                        await fetch(`/api/lobby/${gameState.lobbyId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            play_again_request: null,
                            play_again_requester_name: null,
                            play_again_rejected: true,
                            play_again_rejecter_name: gameState.currentPlayer?.name || user?.name,
                          }),
                        })
                      } catch (error) {
                        console.error('Error rejecting play again:', error)
                      }
                    }
                    setIsLeavingLobby(true)
                    await leaveGame()
                    setTimeout(() => {
                      setIsLeavingLobby(false)
                      router.push('/')
                    }, 500)
                  }}
                  variant="outline"
                  className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 font-mono text-destructive"
                >
                  REJECT
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Play again rejected */}
        <Dialog open={showPlayAgainRejected} onOpenChange={async (open) => {
          if (!open) {
            setShowPlayAgainRejected(false)
            setIsLeavingLobby(true)
            await leaveGame()
            setTimeout(() => {
              setIsLeavingLobby(false)
              router.push('/')
            }, 500)
          }
        }}>
          <DialogContent className="sm:max-w-md cyber-border glow-destructive">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-destructive/10 border-destructive/20 border">
                  <Home className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <DialogTitle className="font-mono text-2xl text-destructive">
                    REQUEST.REJECTED
                  </DialogTitle>
                  <DialogDescription className="font-mono text-muted-foreground">
                    Battle declined
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="cyber-border p-4 rounded-xl bg-destructive/10 border-destructive/40 text-center">
                <p className="text-destructive font-mono text-sm mb-2">
                  {rejectorName} has rejected this battle
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  Returning to main menu...
                </p>
              </div>
              <Button
                onClick={async () => {
                  setShowPlayAgainRejected(false)
                  setIsLeavingLobby(true)
                  await leaveGame()
                  setTimeout(() => {
                    setIsLeavingLobby(false)
                    router.push('/')
                  }, 500)
                }}
                className="w-full bg-primary hover:bg-primary/90 glow-primary font-mono"
              >
                BACK.TO.MENU
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}