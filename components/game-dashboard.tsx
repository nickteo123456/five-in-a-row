'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Home, Loader2, LogOut, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CellPosition } from '@/types/game'
import { useAuth } from './auth-provider'
import { GameBoard, PlayerCards } from './game-board'
import { useGame } from './game-provider'
import { GameOverDialog, OnlineDialogs, ResultsScreen } from './game-results'
import { HomeMenu } from './home-menu'
import { useI18n } from './i18n-provider'
import { QuizInterface } from './quiz-interface'
import { SoundToggle } from './settings-controls'

function TransitionScreen({ icon: Icon, text }: { icon: typeof Globe; text: string }) {
  return (
    <div className="min-h-dvh cyber-grid flex items-center justify-center p-4">
      <div className="text-center">
        <Icon className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
        <p className="text-xl font-semibold text-primary flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {text}
        </p>
      </div>
    </div>
  )
}

function GameScreen({ onLeave }: { onLeave: () => void }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { gameState } = useGame()
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const { boardMode, canPlacePiece, gameMode, isGameOver, players, currentPlayer } = gameState
  const isPhysical = boardMode === 'physical'
  const opponent = players.find((player) => player.id !== user?.id)
  const isOpponentOffline = gameMode === 'online' && opponent && !opponent.isOnline
  const isMyOnlineTurn = gameMode === 'online' && currentPlayer?.id === user?.id

  return (
    <div className="min-h-dvh cyber-grid">
      <div className="mx-auto max-w-6xl px-3 py-3 space-y-3">
        <header className="flex items-center justify-between gap-2">
          <p role="status" className="font-semibold truncate">
            {!isGameOver &&
              (isMyOnlineTurn
                ? t('game.yourTurn')
                : t('game.turn', { name: currentPlayer?.name || '' }))}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <SoundToggle />
            <Button
              size="sm"
              variant="outline"
              onClick={() => (isPhysical ? onLeave() : setShowLeaveConfirmation(true))}
              className="gap-1.5 text-destructive border-destructive/40 bg-background/60"
            >
              <LogOut className="h-4 w-4" />
              {t(isPhysical ? 'game.end' : 'game.leave')}
            </Button>
          </div>
        </header>

        {isOpponentOffline && (
          <p className="flex items-center gap-2 text-sm rounded-lg border border-chart-5/50 bg-chart-5/10 p-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            {t('game.opponentOffline', { name: opponent.name })}
          </p>
        )}

        <PlayerCards />

        {isPhysical ? (
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <h2 className="font-bold text-primary">{t('game.realBoardTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('game.realBoardBody')}</p>
            </div>
            <QuizInterface />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3 items-start">
            {/* On phones the part that needs attention right now comes first */}
            <div className={canPlacePiece ? 'order-1' : 'order-2 lg:order-1'}>
              <GameBoard />
            </div>
            <div className={canPlacePiece ? 'order-2' : 'order-1 lg:order-2'}>
              <QuizInterface />
            </div>
          </div>
        )}
      </div>

      <Dialog open={showLeaveConfirmation} onOpenChange={setShowLeaveConfirmation}>
        <DialogContent className="sm:max-w-md cyber-border">
          <DialogHeader>
            <DialogTitle>{t('game.leaveTitle')}</DialogTitle>
            <DialogDescription>{t('game.leaveBody')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setShowLeaveConfirmation(false)}>
              {t('game.stay')}
            </Button>
            <Button variant="destructive" onClick={onLeave}>
              {t('game.leave')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function GameDashboard() {
  const { t } = useI18n()
  const router = useRouter()
  const { gameState, leaveGame, resumeOnlineGame } = useGame()
  const [isCreatingLobby, setIsCreatingLobby] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  // Remembers which finished game's results were opened; a new game has a new last move
  const [resultsOpenedFor, setResultsOpenedFor] = useState<CellPosition | null | undefined>()

  const { lobbyCode, isGameActive, isGameOver, lastMove, gameMode, opponentLeft } = gameState
  const isWaitingInLobby = Boolean(lobbyCode) && !isGameActive && !isGameOver && !opponentLeft

  useEffect(() => {
    resumeOnlineGame()
  }, [resumeOnlineGame])

  useEffect(() => {
    if (isWaitingInLobby) router.replace(`/lobby/${lobbyCode}`)
  }, [isWaitingInLobby, lobbyCode, router])

  const handleLeave = async () => {
    setIsLeaving(true)
    await leaveGame()
    setIsCreatingLobby(false)
    setIsLeaving(false)
  }

  if (isLeaving) return <TransitionScreen icon={Home} text={t('game.leaving')} />
  if (isCreatingLobby || isWaitingInLobby) {
    return <TransitionScreen icon={Globe} text={t('game.creatingLobby')} />
  }

  if (!isGameActive && !isGameOver && !opponentLeft) {
    return <HomeMenu onCreatingLobby={setIsCreatingLobby} />
  }

  const hasOpenedResults = isGameOver && resultsOpenedFor === lastMove

  return (
    <>
      {hasOpenedResults ? (
        <ResultsScreen onLeave={handleLeave} />
      ) : (
        <GameScreen onLeave={handleLeave} />
      )}
      {isGameOver && !hasOpenedResults && (
        <GameOverDialog onContinue={() => setResultsOpenedFor(lastMove)} />
      )}
      {gameMode === 'online' && <OnlineDialogs onLeave={handleLeave} />}
    </>
  )
}
