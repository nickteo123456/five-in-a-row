'use client'

import { useRouter } from 'next/navigation'
import { Activity, Award, CheckCircle2, Lock, Target, TrendingUp, Trophy } from 'lucide-react'
import {
  DashboardHeader,
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  Section,
  StatCard,
  TopicBars,
  formatDuration,
} from '@/components/dashboard/shared'
import { useI18n } from '@/components/i18n-provider'
import { PlayerAvatar } from '@/components/player-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getJson, useFetchJson } from '@/hooks/use-fetch-json'
import { evaluateAchievements } from '@/lib/achievements'
import type { MissedQuestionSummary, TopicProgress } from '@/lib/learning'
import type { MessageKey } from '@/lib/i18n/messages'

interface MatchRecord {
  id: string
  score: number
  correctAnswers: number
  totalQuestions: number
  gameMode: string
  duration: number
  completedAt: string
  opponentName?: string
  opponentScore?: number
  isWinner?: boolean
}

interface StudentData {
  user: { id: string; email: string; name: string | null; role: string; createdAt: string }
  stats: {
    totalMatches: number
    totalScore: number
    highestScore: number
    avgScore: number
    accuracy: number
    wins: number
    totalCorrect: number
    totalQuestions: number
  }
  matchHistory: MatchRecord[]
}

interface LearningData {
  topics: TopicProgress[]
  reviewQuestions: MissedQuestionSummary[]
  totalAttempts: number
  totalCorrect: number
}

async function loadDashboard() {
  const [student, learning] = await Promise.all([
    getJson<StudentData>('/api/student/stats'),
    getJson<LearningData>('/api/student/learning'),
  ])

  return { student, learning }
}

function correctOption(question: MissedQuestionSummary['question']): string {
  return [question.option_a, question.option_b, question.option_c, question.option_d][
    question.correct_answer
  ]
}

function Achievements({ student, learning }: Awaited<ReturnType<typeof loadDashboard>>) {
  const { t } = useI18n()
  const achievements = evaluateAchievements({
    totalMatches: student.stats.totalMatches,
    wins: student.stats.wins,
    highestScore: student.stats.highestScore,
    totalCorrect: learning.totalCorrect,
    topicsPractised: learning.topics.length,
  })

  return (
    <Section title={t('learn.achievements')}>
      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {achievements.map(({ id, goal, value, isUnlocked }) => (
          <li
            key={id}
            className={`p-3 rounded-lg border min-w-0 ${
              isUnlocked ? 'border-accent/50 bg-accent/10' : 'border-border opacity-70'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              {isUnlocked ? (
                <Award className="h-4 w-4 shrink-0 text-accent" />
              ) : (
                <Lock className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate">{t(`achievement.${id}`)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`achievement.${id}Hint` as MessageKey)}
            </p>
            {!isUnlocked && (
              <p className="text-xs font-mono mt-1">
                {value} / {goal}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

export default function StudentDashboard() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data, hasFailed, reload } = useFetchJson(loadDashboard)

  if (hasFailed) return <ErrorState onRetry={reload} />
  if (!data) return <DashboardSkeleton />

  const { student, learning } = data
  const { stats, user, matchHistory } = student
  const formatDate = (date: string) => new Date(date).toLocaleDateString(locale)
  const answerAccuracy =
    learning.totalAttempts > 0
      ? `${Math.round((learning.totalCorrect / learning.totalAttempts) * 100)}%`
      : '-'

  return (
    <div className="min-h-dvh cyber-grid">
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <DashboardHeader title={t('dash.studentTitle')} />

        <section className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card/90 p-3 sm:p-4">
          <PlayerAvatar name={user.name || user.email} className="h-14 w-14 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-lg truncate">{user.name || user.email}</div>
            <div className="text-sm text-muted-foreground truncate">{user.email}</div>
            <div className="text-xs text-muted-foreground">
              {t('dash.joined', { date: formatDate(user.createdAt) })}
            </div>
          </div>
          <Badge className="bg-primary/20 text-primary shrink-0">
            {t(user.role === 'teacher' ? 'dash.teacher' : 'dash.student')}
          </Badge>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Trophy} label={t('dash.highestScore')} value={stats.highestScore} />
          <StatCard icon={Target} label={t('dash.totalScore')} value={stats.totalScore} />
          <StatCard icon={Activity} label={t('dash.games')} value={stats.totalMatches} />
          <StatCard
            icon={TrendingUp}
            label={t('dash.winRate')}
            value={stats.totalMatches > 0 ? `${stats.accuracy}%` : '-'}
          />
          <StatCard icon={CheckCircle2} label={t('dash.answerAccuracy')} value={answerAccuracy} />
          <StatCard
            icon={TrendingUp}
            label={t('dash.averageScore')}
            value={stats.totalMatches > 0 ? stats.avgScore : '-'}
          />
        </div>

        <Section title={t('learn.topics')} hint={t('learn.topicsHint')}>
          {learning.topics.length > 0 ? (
            <TopicBars topics={learning.topics} />
          ) : (
            <EmptyState text={t('learn.topicsEmpty')} />
          )}
        </Section>

        <Section title={t('learn.review')} hint={t('learn.reviewHint')}>
          {learning.reviewQuestions.length > 0 ? (
            <ul className="space-y-2">
              {learning.reviewQuestions.map(({ question, wrongCount }) => (
                <li key={question.id} className="p-3 rounded-lg border border-border space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="whitespace-pre-wrap min-w-0">{question.question}</p>
                    <Badge variant="outline" className="shrink-0">
                      {t('learn.wrongCount', { count: wrongCount })}
                    </Badge>
                  </div>
                  <p className="font-semibold text-accent text-sm">
                    {t('learn.answer', { answer: correctOption(question) })}
                  </p>
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text={t('learn.reviewEmpty')} />
          )}
        </Section>

        <Achievements student={student} learning={learning} />

        <Section title={t('dash.matchHistory')}>
          {matchHistory.length > 0 ? (
            <ul className="space-y-2">
              {matchHistory.map((match) => (
                <li
                  key={match.id}
                  className={`p-3 rounded-lg border grid grid-cols-2 md:grid-cols-5 gap-2 text-sm ${
                    match.isWinner ? 'border-accent/40' : 'border-destructive/40'
                  }`}
                >
                  <div>
                    <div className="text-xs text-muted-foreground">{t('dash.result')}</div>
                    <span
                      className={`font-bold ${match.isWinner ? 'text-accent' : 'text-destructive'}`}
                    >
                      {t(match.isWinner ? 'dash.win' : 'dash.loss')}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('dash.yourScore')}</div>
                    <span className="font-bold font-mono text-primary">{match.score}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{t('dash.opponent')}</div>
                    <div className="truncate">
                      {match.opponentName} ({match.opponentScore})
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('dash.duration')}</div>
                    <span className="font-mono">{formatDuration(match.duration)}</span>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t('dash.date')}</div>
                    {formatDate(match.completedAt)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text={t('dash.emptyBody')}>
              <Button onClick={() => router.push('/')}>{t('dash.startPlaying')}</Button>
            </EmptyState>
          )}
        </Section>
      </main>
    </div>
  )
}
