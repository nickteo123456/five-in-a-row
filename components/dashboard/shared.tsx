'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useI18n } from '@/components/i18n-provider'
import { LanguageToggle } from '@/components/settings-controls'
import { Button } from '@/components/ui/button'

export function DashboardHeader({ title }: { title: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const { logout } = useAuth()

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="gap-1.5 bg-background/60"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('dash.backToGame')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="gap-1.5 bg-background/60 text-destructive border-destructive/40"
        >
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </Button>
      </div>
    </header>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-border bg-card/90 p-3 sm:p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-bold font-mono text-primary truncate">
        {value}
      </div>
    </div>
  )
}

export function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card/90 p-3 sm:p-5 space-y-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="py-8 text-center text-muted-foreground space-y-3">
      <p>{text}</p>
      {children}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()

  return (
    <div className="min-h-dvh cyber-grid flex items-center justify-center p-4">
      <div role="alert" className="text-center space-y-3">
        <p className="text-lg font-semibold">{t('dash.loadFailed')}</p>
        <Button onClick={onRetry}>{t('common.retry')}</Button>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-dvh cyber-grid" aria-busy="true">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4 animate-pulse">
        <div className="h-10 w-2/3 rounded-lg bg-muted/50" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-xl bg-muted/40" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/40" />
      </div>
    </div>
  )
}

export function TopicBars({
  topics,
}: {
  topics: { topic: string; correct: number; total: number; accuracy: number }[]
}) {
  const { t } = useI18n()

  return (
    <ul className="space-y-3">
      {topics.map(({ topic, correct, total, accuracy }) => (
        <li key={topic}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-medium truncate">{topic}</span>
            <span className="text-muted-foreground shrink-0">
              {accuracy}% · {t('learn.topicAttempts', { correct, total })}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${accuracy < 50 ? 'bg-destructive' : accuracy < 80 ? 'bg-chart-5' : 'bg-accent'}`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
