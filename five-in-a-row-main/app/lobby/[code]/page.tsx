'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Globe, Copy, Check, Users, Crown, ArrowLeft, Loader2 } from 'lucide-react';
import { useGame } from '@/components/game-provider';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { LobbyQRCode } from '@/components/lobby-qr-code';

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { gameState, createLobby, joinLobby, leaveGame } = useGame();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [startingGame, setStartingGame] = useState(false);
  
  const lobbyCode = params.code as string;
  const isHost = user?.id === gameState.players[0]?.id;

  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/lobby/${lobbyCode}`)}`);
      return;
    }

    // Prevent redirecting to main page on refresh by clearing the leaving flag
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLeavingLobby');
    }

    // Check if we're already in this lobby (e.g., we just created it or refreshed)
    if (gameState.lobbyCode === lobbyCode && gameState.lobbyId) {
      console.log('Already in lobby, skipping join');
      setInitializing(false);
      setLoading(false);
      return;
    }

    // If not, we need to join/rejoin the lobby (handles refresh case)
    const initializeLobby = async () => {
      console.log('Joining lobby:', lobbyCode);
      const joined = await joinLobby(lobbyCode, user.id, user.name);
      
      if (!joined) {
        toast.error('Lobby not found', {
          description: 'This lobby may have expired or does not exist',
        });
        setTimeout(() => router.push('/'), 2000);
      } else {
        console.log('Successfully joined/rejoined lobby');
      }
      
      setInitializing(false);
      setLoading(false);
    };

    initializeLobby();
  }, [user, lobbyCode, gameState.lobbyCode, gameState.lobbyId, joinLobby, router]);

  // Redirect to game when it starts
  useEffect(() => {
    if (gameState.isGameActive && gameState.players.length === 2) {
      router.push('/');
    }
  }, [gameState.isGameActive, gameState.players.length, router]);

  const copyLobbyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    toast.success('Lobby code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    // Set leaving flag to show transition screen
    localStorage.setItem('isLeavingLobby', 'true');
    
    // Delete lobby from database to free up the code
    if (gameState.lobbyId && user?.id) {
      try {
        await fetch(`/api/lobby/${gameState.lobbyId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        console.log('Lobby deleted when leaving');
      } catch (error) {
        console.error('Error deleting lobby when leaving:', error);
      }
    }
    
    // Reset game state and go back to main menu
    leaveGame();
    router.push('/');
  };

  const handleStartGame = async () => {
    if (!isHost || gameState.players.length !== 2) return;
    
    setStartingGame(true);
    try {
      // Update lobby status to 'active' to start the game
      const response = await fetch(`/api/lobby/${gameState.lobbyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
        }),
      });

      if (response.ok) {
        toast.success('Game starting!');
        
        // Note: Keep the lobby alive during the game for move synchronization
        // Polling will continue to sync board state between players
        // Lobby will be cleaned up when game ends or by cleanup cron job
        
        // The polling will pick up the 'active' status and both players will enter game
      } else {
        toast.error('Failed to start game');
        setStartingGame(false);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game');
      setStartingGame(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="min-h-screen cyber-grid flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">Connecting to lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cyber-grid">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center mb-8">
          <Button
            onClick={handleLeave}
            variant="outline"
            className="cyber-border gap-2 hover:!text-foreground hover:!border-primary hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Leave Lobby
          </Button>
        </div>

        {/* Lobby Code Display - Top Center */}
        <div className="flex justify-center mb-12">
          <Card className="cyber-border glow-primary w-full max-w-4xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold font-mono text-primary">ONLINE LOBBY</h2>
                </div>
                <div className="text-muted-foreground font-mono text-sm mb-6">
                  Share this code with your opponent
                </div>
                
                {/* Lobby code and QR stacked */}
                <div className="space-y-8">
                  <div className="cyber-border p-6 rounded-xl bg-primary/10 border-primary/40">
                    <div className="text-5xl md:text-6xl font-bold text-primary font-mono tracking-widest">
                      {lobbyCode}
                    </div>
                  </div>
                  <Button
                    onClick={copyLobbyCode}
                    variant="outline"
                    className="cyber-border font-mono hover:glow-primary hover:!text-foreground w-full"
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
                  
                  {/* Divider */}
                  <div className="flex items-center gap-4 justify-center">
                    <div className="flex-1 h-px bg-primary/20"></div>
                    <span className="text-xs text-muted-foreground font-mono">OR</span>
                    <div className="flex-1 h-px bg-primary/20"></div>
                  </div>
                  
                  <div className="mx-auto max-w-xs md:max-w-sm">
                    <LobbyQRCode lobbyCode={lobbyCode} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Players List */}
        <div className="max-w-4xl mx-auto">
          <Card className="cyber-border glow-accent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <CardTitle className="font-mono text-accent">PLAYERS IN LOBBY</CardTitle>
              </div>
              <CardDescription className="font-mono">
                Waiting for {2 - gameState.players.length} more player{2 - gameState.players.length !== 1 ? 's' : ''}... (Current: {gameState.players.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {console.log('[Lobby Page] Rendering players:', gameState.players)}
                {gameState.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="cyber-border p-4 rounded-xl bg-primary/5 border-primary/30 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/30">
                        <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl">
                          {player.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold font-mono">{player.name}</h3>
                          {index === 0 && (
                            <Badge className="bg-accent/20 text-accent border-accent font-mono">
                              <Crown className="h-3 w-3 mr-1" />
                              HOST
                            </Badge>
                          )}
                          {user?.id === player.id && (
                            <Badge className="bg-primary/20 text-primary border-primary font-mono">
                              YOU
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono mt-1">
                          Playing as: <span className={`font-bold ${player.piece === 'X' ? 'text-primary' : 'text-accent'}`}>
                            {player.piece}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-accent animate-pulse"></div>
                        <span className="text-xs text-muted-foreground font-mono">ONLINE</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: 2 - gameState.players.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="cyber-border p-4 rounded-xl bg-muted/5 border-muted-foreground/20 border-dashed"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-muted-foreground/20">
                        <AvatarFallback className="bg-muted/10 text-muted-foreground font-mono text-xl">
                          ?
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-mono text-muted-foreground">Waiting for player...</h3>
                        <div className="text-sm text-muted-foreground font-mono mt-1">
                          Player slot {gameState.players.length + index + 1}
                        </div>
                      </div>
                      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                    </div>
                  </div>
                ))}
              </div>

              {gameState.players.length === 2 && (
                <div className="mt-6 space-y-4">
                  <div className="cyber-border p-4 rounded-xl bg-accent/10 border-accent/40 text-center">
                    <div className="text-accent font-bold text-lg font-mono mb-2">
                      ✓ ALL PLAYERS READY
                    </div>
                    <div className="text-muted-foreground font-mono text-sm">
                      {isHost ? 'Click START GAME to begin' : 'Waiting for host to start the game...'}
                    </div>
                  </div>
                  {isHost && (
                    <Button
                      onClick={handleStartGame}
                      disabled={startingGame}
                      className="w-full h-14 bg-accent hover:bg-accent/90 text-accent-foreground glow-accent font-mono text-lg"
                    >
                      {startingGame ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          STARTING...
                        </>
                      ) : (
                        'START GAME'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Rules */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="cyber-border">
            <CardHeader>
              <CardTitle className="font-mono text-secondary">GAME RULES</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground space-y-2 text-sm font-mono">
                <li>{">"} Host (Player 1) plays as X and goes first</li>
                <li>{">"} Guest (Player 2) plays as O and goes second</li>
                <li>{">"} Answer questions correctly to place your piece</li>
                <li>{">"} Wrong answer switches turn to opponent</li>
                <li>{">"} Get 5 in a row to win (any direction)</li>
                <li>{">"} Host clicks START GAME when both players are ready</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

