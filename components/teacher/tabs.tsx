'use client'

import { useMemo, useState } from 'react'
import { Activity, Crown, Loader2, Target, Trash2, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, Section, StatCard, TopicBars } from '@/components/dashboard/shared'
import { useI18n } from '@/components/i18n-provider'
import { PlayerAvatar } from '@/components/player-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TeacherData } from '@/hooks/use-teacher-data'

export function OverviewTab({ data }: { data: TeacherData }) {
  const { t, locale } = useI18n()
  const { students, ownMatches } = data
  const totalGames = students.reduce((sum, student) => sum + student.total_matches, 0)
  const classAverage =
    students.length > 0
      ? Math.round(
          students.reduce((sum, student) => sum + student.average_score, 0) / students.length
        )
      : 0
  const topStudent = students[0]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label={t('teacher.totalStudents')} value={students.length} />
        <StatCard icon={Activity} label={t('teacher.classGames')} value={totalGames} />
        <StatCard icon={TrendingUp} label={t('teacher.classAverage')} value={classAverage} />
        <StatCard icon={Crown} label={t('teacher.topStudent')} value={topStudent?.name || '-'} />
      </div>

      <Section title={t('teacher.myGames')}>
        {ownMatches.length > 0 ? (
          <ul className="space-y-2">
            {ownMatches.slice(0, 10).map((match) => (
              <li key={match.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                <span
                  className={`font-bold w-10 ${match.isWinner ? 'text-accent' : 'text-destructive'}`}
                >
                  {t(match.isWinner ? 'dash.win' : 'dash.loss')}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  {t('teacher.versus', { name: match.opponentName || '' })}
                </span>
                <span className="font-mono text-primary">{match.score}</span>
                <span className="text-muted-foreground hidden sm:inline">
                  {new Date(match.completedAt).toLocaleDateString(locale)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState text={t('teacher.noMyGames')} />
        )}
      </Section>
    </div>
  )
}

export function StudentsTab({ data, onChange }: { data: TeacherData; onChange: () => void }) {
  const { t, translateError } = useI18n()
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const students = useMemo(() => {
    const term = search.trim().toLowerCase()

    return data.students.filter(
      ({ name, email }) =>
        !term || name.toLowerCase().includes(term) || email.toLowerCase().includes(term)
    )
  }, [data.students, search])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('teacher.deleteConfirm', { name }))) return

    setDeletingId(id)

    try {
      const response = await fetch(`/api/teacher/students/${id}`, { method: 'DELETE' })

      if (response.ok) {
        toast.success(t('teacher.deleted', { name }))
        onChange()
      } else {
        const body = await response.json()
        toast.error(translateError(body.error) || t('teacher.deleteFailed'))
      }
    } catch {
      toast.error(t('teacher.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Section title={t('teacher.students')}>
      <Input
        type="search"
        aria-label={t('teacher.search')}
        placeholder={t('teacher.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {students.length === 0 ? (
        <EmptyState text={t('teacher.noStudents')} />
      ) : (
        <ul className="space-y-2">
          {students.map((student) => (
            <li key={student.user_id} className="p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={student.name} className="h-10 w-10" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{student.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{student.email}</div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={deletingId === student.user_id}
                  onClick={() => handleDelete(student.user_id, student.name)}
                  aria-label={`${t('common.delete')} ${student.name}`}
                  className="text-destructive border-destructive/40 shrink-0"
                >
                  {deletingId === student.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                {[
                  [t('dash.games'), student.total_matches],
                  [t('dash.highestScore'), student.highest_score],
                  [t('dash.winRate'), `${student.overall_accuracy}%`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground truncate">{label}</dt>
                    <dd className="font-mono font-bold text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export function HistoryTab({ data }: { data: TeacherData }) {
  const { t, locale } = useI18n()

  return (
    <Section title={t('teacher.history')}>
      {data.matches.length === 0 ? (
        <EmptyState text={t('teacher.noHistory')} />
      ) : (
        <ul className="space-y-2">
          {data.matches.map((match) => (
            <li key={match.id} className="p-3 rounded-lg border flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-semibold text-accent min-w-0 truncate">
                {match.student_name} ({match.score})
              </span>
              <span className="text-muted-foreground min-w-0 truncate">
                {t('teacher.versus', { name: `${match.opponent_name} (${match.opponent_score})` })}
              </span>
              <span className="ml-auto text-sm text-muted-foreground">
                {new Date(match.completed_at).toLocaleDateString(locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export function InsightsTab({ data }: { data: TeacherData }) {
  const { t } = useI18n()
  const { topics, hardestQuestions, totalAttempts } = data.insights

  if (totalAttempts === 0) {
    return (
      <Section title={t('teacher.insights')}>
        <EmptyState text={t('teacher.insightsEmpty')} />
      </Section>
    )
  }

  return (
    <div className="space-y-4">
      <Section title={t('teacher.classTopics')} hint={t('teacher.classTopicsHint')}>
        <TopicBars topics={topics} />
      </Section>

      <Section title={t('teacher.hardest')} hint={t('teacher.hardestHint')}>
        <ul className="space-y-2">
          {hardestQuestions.map(({ question, wrongCount, total }) => (
            <li key={question.id} className="p-3 rounded-lg border space-y-1">
              <p className="whitespace-pre-wrap">{question.question}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4 text-destructive" />
                {t('teacher.wrongRate', { wrong: wrongCount, total })}
                <Badge variant="outline">{question.topic}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
