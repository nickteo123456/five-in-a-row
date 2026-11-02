"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe, Copy, Check, Loader2, Users, LogIn } from "lucide-react"
import { useGame } from "./game-provider"
import { useAuth } from "./auth-provider"
import { toast } from "sonner"

interface LobbyDialogProps {
  onClose: () => void
  onCreatingLobby: (isCreating: boolean) => void
}

export function LobbyDialog({ onClose, onCreatingLobby }: LobbyDialogProps) {
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu")
  const [lobbyCode, setLobbyCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { createLobby, joinLobby, gameState } = useGame()
  const { user } = useAuth()
  const router = useRouter()

  // Auto-close dialog when game starts (both players ready)
  useEffect(() => {
    if (gameState.isGameActive && gameState.players.length === 2) {
      onClose()
    }
  }, [gameState.isGameActive, gameState.players.length, onClose])

  const handleCreateLobby = async () => {
    if (!user) return

    // Close dialog and show "Creating Lobby..." page
    onClose()
    onCreatingLobby(true)
    
    try {
      const result = await createLobby(user.id, user.name)
      if (result) {
        // Navigate using router to preserve session
        router.replace(`/lobby/${result.lobbyCode}`)
      }
    } catch (error) {
      console.error("Error creating lobby:", error)
      onCreatingLobby(false)
      toast.error('Failed to create lobby')
    }
  }

  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !joinCode.trim()) return

    setLoading(true)
    const code = joinCode.trim().toUpperCase()
    
    try {
      // Check if lobby exists before navigating
      const response = await fetch(`/api/lobby/${code}`)
      
      if (response.status === 404) {
        toast.error('Lobby Not Found', {
          description: 'This lobby code does not exist or has expired',
          duration: 4000,
        })
        setLoading(false)
        return
      }
      
      if (!response.ok) {
        toast.error('Failed to join lobby', {
          description: 'Please check the code and try again',
        })
        setLoading(false)
        return
      }
      
      const { lobby } = await response.json()
      
      console.log('Lobby data when trying to join:', lobby)
      console.log('Lobby status:', lobby.status)
      console.log('Lobby guest_user_id:', lobby.guest_user_id)
      
      // Check if lobby is joinable
      if (lobby.status !== 'waiting') {
        console.error('Cannot join - status is not waiting:', lobby.status)
        toast.error('Lobby Not Available', {
          description: `This lobby status is '${lobby.status}' - cannot join`,
          duration: 4000,
        })
        setLoading(false)
        return
      }
      
      if (lobby.guest_user_id) {
        console.error('Cannot join - lobby already has guest:', lobby.guest_user_id)
        toast.error('Lobby Full', {
          description: 'This lobby already has 2 players',
          duration: 4000,
        })
        setLoading(false)
        return
      }
      
      console.log('All checks passed, navigating to lobby')
      
      // All checks passed, navigate to lobby
      onClose()
      onCreatingLobby(true)
      router.replace(`/lobby/${code}`)
      
    } catch (error) {
      console.error('Error checking lobby:', error)
      toast.error('Connection Error', {
        description: 'Failed to connect to the lobby',
      })
      setLoading(false)
    }
  }

  const copyLobbyCode = () => {
    navigator.clipboard.writeText(lobbyCode)
    setCopied(true)
    toast.success("Code copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (mode === "create" && lobbyCode) {
    return (
      <Dialog open onOpenChange={loading ? undefined : onClose}>
        <DialogContent className="sm:max-w-md cyber-border glow-primary">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                {loading ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <Globe className="h-5 w-5 text-primary" />
                )}
              </div>
              <DialogTitle className="font-mono text-primary">
                {loading ? "CREATING.LOBBY..." : "LOBBY.CREATED"}
              </DialogTitle>
            </div>
            <DialogDescription className="font-mono text-muted-foreground">
              {loading ? ">" : ">"} {loading ? "Initializing online match..." : "Waiting for opponent to join..."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="cyber-border p-6 rounded-xl bg-primary/10 border-primary/40 text-center">
              <div className="text-muted-foreground font-mono text-sm mb-2">LOBBY CODE</div>
              <div className="text-5xl font-bold text-primary font-mono tracking-wider mb-4">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin" />
                  </div>
                ) : (
                  lobbyCode
                )}
              </div>
              <Button
                onClick={copyLobbyCode}
                variant="outline"
                className="cyber-border font-mono hover:glow-primary hover:!text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="cyber-border p-4 rounded-xl bg-secondary/5">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-secondary mt-0.5" />
                <div className="text-sm font-mono">
                  <div className="text-secondary mb-1">INSTRUCTIONS</div>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>{">"} Share this code with your opponent</li>
                    <li>{">"} They can join from the main menu</li>
                    <li>{">"} Game will start automatically when they join</li>
                    <li>{">"} You will play as X (first move)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full border-destructive/30 hover:border-destructive hover:bg-destructive/10 font-mono bg-transparent"
              disabled={loading}
            >
              ABORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (mode === "join") {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md cyber-border glow-accent">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <Globe className="h-5 w-5 text-accent" />
              </div>
              <DialogTitle className="font-mono text-accent">JOIN.LOBBY</DialogTitle>
            </div>
            <DialogDescription className="font-mono text-muted-foreground">
              {">"} Enter the 5-digit lobby code to join
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleJoinLobby} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="lobbyCode" className="font-mono text-accent">
                LOBBY.CODE
              </Label>
              <Input
                id="lobbyCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 5-digit code"
                maxLength={5}
                required
                className="cyber-border font-mono text-center text-2xl tracking-widest bg-input/50 focus:glow-accent"
              />
            </div>

            <div className="cyber-border p-4 rounded-xl bg-secondary/5">
              <div className="flex items-start gap-3">
                <LogIn className="h-5 w-5 text-secondary mt-0.5" />
                <div className="text-sm font-mono">
                  <div className="text-secondary mb-1">GAME.RULES</div>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>{">"} You will play as O (second move)</li>
                    <li>{">"} Answer questions correctly to place pieces</li>
                    <li>{">"} Wrong answer switches turn to opponent</li>
                    <li>{">"} Get 5 in a row to win (any direction)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                onClick={() => setMode("menu")}
                variant="outline"
                className="flex-1 border-destructive/30 hover:border-destructive hover:bg-destructive/10 font-mono bg-transparent"
                disabled={loading}
              >
                BACK
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-accent hover:bg-accent/90 glow-accent font-mono"
                disabled={loading || joinCode.length !== 5}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    CHECKING...
                  </>
                ) : (
                  "JOIN.GAME"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md cyber-border glow-primary">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="font-mono text-primary">ONLINE.INTERFACE.INIT</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-muted-foreground">
            {">"} Select multiplayer mode to challenge players worldwide
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Button
              onClick={handleCreateLobby}
              className="w-full h-auto p-4 cyber-border bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 hover:border-primary hover:glow-primary transition-all font-mono"
              disabled={loading}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">Create New Lobby</div>
                  <div className="text-xs text-muted-foreground">
                    Generate a code and wait for an opponent
                  </div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setMode("join")}
              className="w-full h-auto p-4 cyber-border bg-accent/10 hover:bg-accent/20 text-accent border-accent/30 hover:border-accent hover:glow-accent transition-all font-mono"
              disabled={loading}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-lg bg-accent/20">
                  <LogIn className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">Join Existing Lobby</div>
                  <div className="text-xs text-muted-foreground">
                    Enter a lobby code to join a friend's game
                  </div>
                </div>
              </div>
            </Button>
          </div>

          <div className="cyber-border p-4 rounded-xl bg-secondary/5">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-secondary mt-0.5" />
              <div className="text-sm font-mono">
                <div className="text-secondary mb-1">ONLINE.FEATURES</div>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>{">"} Real-time multiplayer across devices</li>
                  <li>{">"} Match history saved to database</li>
                  <li>{">"} 5-digit code for easy lobby sharing</li>
                  <li>{">"} Auto-sync game state with opponent</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-destructive/30 hover:border-destructive hover:bg-destructive/10 font-mono bg-transparent"
          >
            ABORT
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

