'use client'

import type React from 'react'
import { useState } from 'react'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, Section } from '@/components/dashboard/shared'
import { useI18n } from '@/components/i18n-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TeacherData } from '@/hooks/use-teacher-data'
import type { DbQuestion, Difficulty } from '@/types/game'

type QuestionForm = Omit<DbQuestion, 'id'> & { id?: string }

const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d'] as const
const FIELD_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

const EMPTY_FORM: QuestionForm = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 0,
  explanation: '',
  difficulty: 'beginner',
  topic: '',
}

function QuestionEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial: QuestionForm
  onSaved: () => void
  onCancel: () => void
}) {
  const { t, translateError } = useI18n()
  const [form, setForm] = useState(initial)
  const [isSaving, setIsSaving] = useState(false)

  const update = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)

    const { id, ...fields } = form
    const body = {
      question: fields.question,
      option_a: fields.option_a,
      option_b: fields.option_b,
      option_c: fields.option_c,
      option_d: fields.option_d,
      correct_answer: fields.correct_answer,
      explanation: fields.explanation,
      difficulty: fields.difficulty,
      topic: fields.topic,
    }

    try {
      const response = await fetch(id ? `/api/questions/${id}` : '/api/questions', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(t('teacher.questionSaved'))
        onSaved()
      } else {
        const data = await response.json()
        toast.error(translateError(data.error) || t('teacher.questionSaveFailed'))
      }
    } catch {
      toast.error(t('teacher.questionSaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Section title={t(form.id ? 'teacher.editQuestion' : 'teacher.newQuestion')}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="question">{t('teacher.questionText')}</Label>
          <textarea
            id="question"
            rows={3}
            required
            value={form.question}
            onChange={(event) => update('question', event.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {OPTION_KEYS.map((key, index) => {
            const letter = String.fromCharCode(65 + index)

            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{t('teacher.option', { letter })}</Label>
                <Input
                  id={key}
                  required
                  value={form[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </div>
            )
          })}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="correct">{t('teacher.correctOption')}</Label>
            <select
              id="correct"
              value={form.correct_answer}
              onChange={(event) => update('correct_answer', Number(event.target.value))}
              className={FIELD_CLASS}
            >
              {OPTION_KEYS.map((key, index) => (
                <option key={key} value={index}>
                  {t('teacher.option', { letter: String.fromCharCode(65 + index) })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="level">{t('setup.difficulty')}</Label>
            <select
              id="level"
              value={form.difficulty}
              onChange={(event) => update('difficulty', event.target.value as Difficulty)}
              className={FIELD_CLASS}
            >
              <option value="beginner">{t('difficulty.beginner')}</option>
              <option value="intermediate">{t('difficulty.intermediate')}</option>
              <option value="advanced">{t('difficulty.advanced')}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topicName">{t('teacher.topic')}</Label>
            <Input
              id="topicName"
              required
              value={form.topic}
              onChange={(event) => update('topic', event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="explanation">{t('teacher.explanation')}</Label>
          <textarea
            id="explanation"
            rows={3}
            required
            value={form.explanation}
            onChange={(event) => update('explanation', event.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Section>
  )
}

export function QuestionsTab({ data, onChange }: { data: TeacherData; onChange: () => void }) {
  const { t, translateError } = useI18n()
  const [editing, setEditing] = useState<QuestionForm | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('teacher.questionDeleteConfirm'))) return

    try {
      const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' })

      if (response.ok) {
        toast.success(t('teacher.questionDeleted'))
        onChange()
      } else {
        const body = await response.json()
        toast.error(translateError(body.error) || t('teacher.questionDeleteFailed'))
      }
    } catch {
      toast.error(t('teacher.questionDeleteFailed'))
    }
  }

  if (editing) {
    return (
      <QuestionEditor
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          onChange()
        }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing(EMPTY_FORM)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        {t('teacher.addQuestion')}
      </Button>

      <Section title={`${t('teacher.questions')} (${data.questions.length})`}>
        {data.questions.length === 0 ? (
          <EmptyState text={t('teacher.noQuestions')} />
        ) : (
          <ul className="space-y-2">
            {data.questions.map((question) => (
              <li key={question.id} className="p-3 rounded-lg border space-y-2">
                <p className="whitespace-pre-wrap">{question.question}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{t(`difficulty.${question.difficulty}`)}</Badge>
                  <Badge variant="outline">{question.topic}</Badge>
                  <div className="ml-auto flex gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditing(question)}
                      aria-label={t('common.edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(question.id)}
                      aria-label={t('common.delete')}
                      className="text-destructive border-destructive/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
