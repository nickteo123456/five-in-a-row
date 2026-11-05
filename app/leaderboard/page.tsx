'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Medal } from 'lucide-react'
import { DashboardSkeleton, EmptyState, ErrorState, Section } from '@/components/dashboard/shared'
import { useAuth } from '@/components/auth-provider'
import { useI18n } from '@/components/i18n-provider'
import { PlayerAvatar } from '@/components/player-avatar'
import { Button } from '@/components/ui/button'
import { getJson, useFetchJson } from '@/hooks/use-fetch-json'

interface LeaderboardPlayer {
  id: string
  name: string
  total_score: number
  matches_played: number
  wins: number
}

const MEDAL_COLORS = ['text-chart-5', 'text-muted-foreground', 'text-chart-4']

export default function LeaderboardPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const load = useCallback(() => getJson<{ players: LeaderboardPlayer[] }>('/api/leaderboard'), [])
  const { data, hasFailed, reload } = useFetchJson(load)

  if (hasFailed) return <ErrorState onRetry={reload} />
  if (!data) return <DashboardSkeleton />

  return (
    <div className="min-h-dvh cyber-grid">
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="gap-1.5 bg-background/60"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('dash.backToGame')}
        </Button>

        <Section title={t('rankings.title')} hint={t('rankings.subtitle')}>
          {data.players.length === 0 ? (
            <EmptyState text={t('rankings.empty')} />
          ) : (
            <ol className="space-y-2">
              {data.players.map((player, index) => (
                <li
                  key={player.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${
                    player.id === user?.id ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <span className="w-7 text-center font-bold font-mono shrink-0">
                    {index < 3 ? (
                      <Medal className={`h-5 w-5 mx-auto ${MEDAL_COLORS[index]}`} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <PlayerAvatar name={player.name} className="h-9 w-9" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('rankings.wins')} {player.wins} · {t('rankings.games')}{' '}
                      {player.matches_played}
                    </div>
                  </div>
                  <span className="font-bold font-mono text-primary">{player.total_score}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </main>
    </div>
  )
}
