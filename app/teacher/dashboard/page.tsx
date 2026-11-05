'use client'

import { useState } from 'react'
import { BarChart3, BookOpen, History, LayoutDashboard, Users } from 'lucide-react'
import { DashboardHeader, DashboardSkeleton, ErrorState } from '@/components/dashboard/shared'
import { useI18n } from '@/components/i18n-provider'
import { QuestionsTab } from '@/components/teacher/questions-tab'
import { HistoryTab, InsightsTab, OverviewTab, StudentsTab } from '@/components/teacher/tabs'
import { useTeacherData } from '@/hooks/use-teacher-data'

const TABS = [
  { id: 'overview', icon: LayoutDashboard, label: 'teacher.overview' },
  { id: 'students', icon: Users, label: 'teacher.students' },
  { id: 'history', icon: History, label: 'teacher.history' },
  { id: 'insights', icon: BarChart3, label: 'teacher.insights' },
  { id: 'questions', icon: BookOpen, label: 'teacher.questions' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function TeacherDashboard() {
  const { t } = useI18n()
  const { data, hasFailed, reload } = useTeacherData()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (hasFailed) return <ErrorState onRetry={reload} />
  if (!data) return <DashboardSkeleton />

  return (
    <div className="min-h-dvh cyber-grid">
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <DashboardHeader title={t('dash.teacherTitle')} />

        <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition ${
                activeTab === id
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-card/70 hover:border-primary/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(label)}
              {id === 'students' && ` (${data.students.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'students' && <StudentsTab data={data} onChange={reload} />}
        {activeTab === 'history' && <HistoryTab data={data} />}
        {activeTab === 'insights' && <InsightsTab data={data} />}
        {activeTab === 'questions' && <QuestionsTab data={data} onChange={reload} />}
      </main>
    </div>
  )
}
