'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { listTopics } from '@/lib/game/questions'
import type { Difficulty, GameSetup } from '@/types/game'
import { useAuth } from './auth-provider'
import { useGame } from './game-provider'
import { useI18n } from './i18n-provider'

export type LocalGameKind = 'computer' | 'screen' | 'realBoard'

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']
const SELECT_CLASS =
  'w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

const TITLES = {
  computer: 'setup.titleComputer',
  screen: 'setup.titleScreen',
  realBoard: 'setup.titleRealBoard',
} as const

export function GameSetupDialog({ kind, onClose }: { kind: LocalGameKind; onClose: () => void }) {
  const { t } = useI18n()
  const { user, isGuest } = useAuth()
  const { joinGame, questions } = useGame()
  const isSolo = kind === 'computer'
  const [player1Name, setPlayer1Name] = useState(isGuest ? '' : user?.name || '')
  const [player2Name, setPlayer2Name] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [topic, setTopic] = useState('all')
  const [isTimed, setIsTimed] = useState(false)
  const topics = useMemo(() => listTopics(questions), [questions])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const setup: GameSetup = {
      mode: isSolo ? 'single' : 'multiplayer',
      boardMode: kind === 'realBoard' ? 'physical' : 'digital',
      player1Name: player1Name.trim(),
      player2Name: player2Name.trim(),
      filter: { difficulty, topic },
      isTimed,
    }

    joinGame(setup)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md cyber-border glow-primary">
        <DialogHeader>
          <DialogTitle className="text-primary">{t(TITLES[kind])}</DialogTitle>
          <DialogDescription>{t('setup.subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="player1Name">{t(isSolo ? 'setup.yourName' : 'setup.player1')}</Label>
            <Input
              id="player1Name"
              placeholder={t('setup.namePlaceholder')}
              value={player1Name}
              onChange={(event) => setPlayer1Name(event.target.value)}
              maxLength={40}
              required
            />
          </div>

          {!isSolo && (
            <div className="space-y-1.5">
              <Label htmlFor="player2Name">{t('setup.player2')}</Label>
              <Input
                id="player2Name"
                placeholder={t('setup.namePlaceholder')}
                value={player2Name}
                onChange={(event) => setPlayer2Name(event.target.value)}
                maxLength={40}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="difficulty">{t('setup.difficulty')}</Label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty | 'all')}
                className={SELECT_CLASS}
              >
                <option value="all">{t('setup.allDifficulties')}</option>
                {DIFFICULTIES.map((level) => (
                  <option key={level} value={level}>
                    {t(`difficulty.${level}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="topic">{t('setup.topic')}</Label>
              <select
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="all">{t('setup.allTopics')}</option>
                {topics.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isTimed}
              onChange={(event) => setIsTimed(event.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            {t('setup.timer')}
          </label>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            {t(isSolo && !isGuest ? 'setup.answersSaved' : 'setup.notSaved')}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('setup.start')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
