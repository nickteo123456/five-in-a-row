'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useGame } from '@/components/game-provider'
import { useI18n } from '@/components/i18n-provider'
import { LobbyQRCode } from '@/components/lobby-qr-code'
import { PlayerAvatar } from '@/components/player-avatar'

export default function LobbyPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const { user, isGuest, loading: authLoading } = useAuth()
  const { gameState, joinLobby, leaveGame, startOnlineGame } = useGame()
  const [copied, setCopied] = useState(false)
  const [startingGame, setStartingGame] = useState(false)
  const hasTriedJoin = useRef(false)

  const lobbyCode = params.code as string
  const isInThisLobby = gameState.lobbyCode === lobbyCode
  const isHost = gameState.isHost
  const { players, isGameActive } = gameState

  useEffect(() => {
    if (authLoading || isInThisLobby || hasTriedJoin.current) return

    if (!user || isGuest) {
      if (isGuest) {
        toast.error(t('lobby.loginRequired'), { description: t('lobby.loginRequiredBody') })
      }
      router.push(`/login?redirect=${encodeURIComponent(`/lobby/${lobbyCode}`)}`)
      return
    }

    hasTriedJoin.current = true

    joinLobby(lobbyCode).then((joined) => {
      if (!joined) router.push('/')
    })
  }, [authLoading, isGuest, isInThisLobby, joinLobby, lobbyCode, router, t, user])

  // Both players go to the game when the host starts it
  useEffect(() => {
    if (isGameActive && players.length === 2) router.push('/')
  }, [isGameActive, players.length, router])

  const copyLobbyCode = () => {
    navigator.clipboard.writeText(lobbyCode)
    setCopied(true)
    toast.success(t('lobby.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLeave = async () => {
    await leaveGame()
    router.push('/')
  }

  const handleStartGame = async () => {
    setStartingGame(true)
    const started = await startOnlineGame()

    if (!started) {
      toast.error(t('lobby.startFailed'))
      setStartingGame(false)
    }
  }

  if (!isInThisLobby) {
    return (
      <div className="min-h-dvh cyber-grid flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('lobby.connecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh cyber-grid">
      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Button onClick={handleLeave} variant="outline" className="gap-2 bg-background/60">
          <ArrowLeft className="h-4 w-4" />
          {t('lobby.leave')}
        </Button>

        <section className="rounded-xl border border-primary/30 bg-card/90 p-4 text-center space-y-3">
          <h1 className="text-xl font-bold text-primary">{t('lobby.code')}</h1>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl sm:text-5xl font-bold font-mono tracking-widest text-primary">
              {lobbyCode}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={copyLobbyCode}
              aria-label={t('lobby.copy')}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t('lobby.share')}</p>
          <div className="flex justify-center">
            <LobbyQRCode lobbyCode={lobbyCode} />
          </div>
        </section>

        <section className="rounded-xl border border-accent/30 bg-card/90 p-4 space-y-3">
          <h2 className="text-lg font-bold text-accent">{t('lobby.players')}</h2>

          {players.map((player, index) => (
            <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border min-w-0">
              <PlayerAvatar name={player.name} className="h-12 w-12" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold truncate">{player.name}</span>
                  {index === 0 && (
                    <Badge className="bg-accent/20 text-accent gap-1">
                      <Crown className="h-3 w-3" />
                      {t('lobby.host')}
                    </Badge>
                  )}
                  {user?.id === player.id && (
                    <Badge className="bg-primary/20 text-primary">{t('common.you')}</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('lobby.piece', { piece: player.piece })}
                </div>
              </div>
            </div>
          ))}

          {players.length < 2 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('lobby.waitingPlayer')}
            </div>
          )}

          {players.length === 2 && (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/40 text-center">
                <div className="text-accent font-bold">{t('lobby.ready')}</div>
                <div className="text-sm text-muted-foreground">
                  {t(isHost ? 'lobby.hostStart' : 'lobby.guestWait')}
                </div>
              </div>
              {isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={startingGame}
                  className="w-full h-12 gap-2"
                >
                  {startingGame && <Loader2 className="h-5 w-5 animate-spin" />}
                  {t(startingGame ? 'lobby.starting' : 'lobby.start')}
                </Button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
