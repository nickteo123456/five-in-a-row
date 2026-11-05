'use client'

import type React from 'react'
import { Home, Lightbulb, RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from './auth-provider'
import { useGame } from './game-provider'
import { useI18n } from './i18n-provider'
import { PlayerAvatar } from './player-avatar'
import { correctAnswerText } from './quiz-interface'

const BURST_COLORS = ['#19c8dc', '#22e38b', '#f5c542', '#8b7cf6']

export function WinBurst() {
  return (
    <div className="win-burst" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            backgroundColor: BURST_COLORS[index % BURST_COLORS.length],
            animationDelay: `${(index % 7) * 0.12}s`,
          }}
        />
      ))}
    </div>
  )
}

function useGameOutcome() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { gameState } = useGame()
  const { winner, isDraw, gameMode, players } = gameState

  if (isDraw || !winner) return { title: t('over.draw'), didWin: false, isNeutral: true }
  if (gameMode === 'multiplayer') {
    return { title: t('over.wins', { name: winner.name }), didWin: true, isNeutral: true }
  }

  const me = gameMode === 'online' ? players.find((p) => p.id === user?.id) : players[0]
  const didWin = winner.id === me?.id

  return { title: t(didWin ? 'over.win' : 'over.lose'), didWin, isNeutral: false }
}

export function GameOverDialog({ onContinue }: { onContinue: () => void }) {
  const { t } = useI18n()
  const { gameState } = useGame()
  const { title, didWin, isNeutral } = useGameOutcome()
  const { players, isDraw } = gameState

  return (
    <>
      {didWin && <WinBurst />}
      <Dialog open>
        <DialogContent showCloseButton={false} className="sm:max-w-md cyber-border glow-accent">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Trophy className={`h-8 w-8 ${didWin ? 'text-accent' : 'text-muted-foreground'}`} />
              <DialogTitle className="text-2xl">{title}</DialogTitle>
            </div>
            <DialogDescription>
              {isDraw
                ? t('over.drawBody')
                : !didWin && !isNeutral
                  ? t('over.encourage')
                  : t('app.tagline')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 text-center">
            {players.map((player) => (
              <div key={player.id} className="p-3 rounded-lg border border-border min-w-0">
                <div className="font-semibold truncate">{player.name}</div>
                <div className="text-2xl font-bold text-primary font-mono">{player.score}</div>
              </div>
            ))}
          </div>

          <Button onClick={onContinue} className="w-full">
            {t('over.seeResults')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ResultsScreen({ onLeave }: { onLeave: () => void }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { gameState, resetBoard, requestRematch } = useGame()
  const { players, tallies, missedQuestions, gameMode } = gameState
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  // Online players only see their own mistakes
  const reviewQuestions =
    gameMode === 'online'
      ? missedQuestions.filter(({ playerId }) => playerId === user?.id)
      : missedQuestions

  return (
    <div className="min-h-dvh cyber-grid">
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-primary text-center">{t('over.results')}</h1>

        <div className="space-y-2">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/90"
            >
              <PlayerAvatar name={player.name} className="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {player.name}
                  {gameState.winner?.id === player.id && (
                    <Trophy className="inline h-4 w-4 ml-1.5 text-chart-5" />
                  )}
                </div>
                {tallies[player.id] && (
                  <div className="text-sm text-muted-foreground">
                    {t('over.accuracy', { ...tallies[player.id] })}
                  </div>
                )}
              </div>
              <div className="text-xl font-bold font-mono text-primary">
                {player.score} <span className="text-xs">{t('common.points')}</span>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t('over.review')}</h2>
          {reviewQuestions.length === 0 ? (
            <p className="text-muted-foreground">{t('over.reviewEmpty')}</p>
          ) : (
            reviewQuestions.map(({ question }, index) => (
              <div
                key={`${question.id}-${index}`}
                className="p-3 rounded-xl border border-secondary/40 bg-card/90 space-y-2"
              >
                <p className="whitespace-pre-wrap">{question.question}</p>
                <p className="font-semibold text-accent">
                  {t('quiz.correctAnswerWas', { answer: correctAnswerText(question, t) })}
                </p>
                <p className="flex gap-2 text-sm text-muted-foreground">
                  <Lightbulb className="h-4 w-4 shrink-0 text-secondary" />
                  {question.explanation}
                </p>
              </div>
            ))
          )}
        </section>

        <div className="grid sm:grid-cols-2 gap-3">
          <Button
            onClick={() => (gameMode === 'online' ? requestRematch() : resetBoard())}
            className="gap-2 h-11"
          >
            <RotateCcw className="h-4 w-4" />
            {t('over.playAgain')}
          </Button>
          <Button variant="outline" onClick={onLeave} className="gap-2 h-11">
            <Home className="h-4 w-4" />
            {t('over.backToMenu')}
          </Button>
        </div>
      </main>
    </div>
  )
}

function SimpleDialog({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-md cyber-border glow-primary">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function OnlineDialogs({ onLeave }: { onLeave: () => void }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { gameState, cancelRematch, acceptRematch, declineRematch } = useGame()
  const { rematch, opponentLeft, players } = gameState
  const opponentName = players.find((player) => player.id !== user?.id)?.name || ''

  if (opponentLeft) {
    return (
      <SimpleDialog title={t('over.opponentLeftTitle')} body={t('over.opponentLeftBody')}>
        <Button onClick={onLeave}>{t('over.backToMenu')}</Button>
      </SimpleDialog>
    )
  }

  if (rematch.rejecterName) {
    return (
      <SimpleDialog
        title={t('over.rematchDeclinedTitle')}
        body={t('over.rematchDeclinedBody', { name: rematch.rejecterName })}
      >
        <Button onClick={onLeave}>{t('over.backToMenu')}</Button>
      </SimpleDialog>
    )
  }

  if (rematch.requesterName) {
    return (
      <SimpleDialog
        title={t('over.rematchRequestTitle')}
        body={t('over.rematchRequestBody', { name: rematch.requesterName })}
      >
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={declineRematch}>
            {t('over.decline')}
          </Button>
          <Button onClick={acceptRematch}>{t('over.accept')}</Button>
        </div>
      </SimpleDialog>
    )
  }

  if (rematch.isWaiting) {
    return (
      <SimpleDialog
        title={t('over.rematchWaitingTitle')}
        body={t('over.rematchWaitingBody', { name: opponentName })}
      >
        <Button variant="outline" onClick={cancelRematch}>
          {t('common.cancel')}
        </Button>
      </SimpleDialog>
    )
  }

  return null
}
