'use client'

import type { MissedQuestionSummary, TopicProgress } from '@/lib/learning'
import { getJson, useFetchJson } from './use-fetch-json'
import type { DbQuestion } from '@/types/game'

export interface Student {
  user_id: string
  name: string
  email: string
  total_matches: number
  highest_score: number
  average_score: number
  overall_accuracy: number
}

export interface TeacherMatch {
  id: string
  user_id: string
  student_name: string
  score: number
  game_mode: string
  completed_at: string
  opponent_name?: string
  opponent_score?: number
  is_winner?: boolean
}

export interface OwnMatch {
  id: string
  score: number
  completedAt: string
  opponentName?: string
  isWinner?: boolean
}

export interface ClassInsights {
  topics: TopicProgress[]
  hardestQuestions: MissedQuestionSummary[]
  totalAttempts: number
}

async function loadTeacherData() {
  const [students, history, own, questions, insights] = await Promise.all([
    getJson<{ students: Student[] }>('/api/teacher/students'),
    getJson<{ matches: TeacherMatch[] }>('/api/teacher/match-history'),
    getJson<{ matchHistory: OwnMatch[] }>('/api/student/stats'),
    getJson<{ questions: DbQuestion[] }>('/api/questions'),
    getJson<ClassInsights>('/api/teacher/insights'),
  ])

  return {
    students: students.students,
    // Each game is stored once per player, so only one side is shown here
    matches: history.matches.filter((match) => match.is_winner),
    ownMatches: own.matchHistory,
    questions: questions.questions,
    insights,
  }
}

export type TeacherData = Awaited<ReturnType<typeof loadTeacherData>>

export function useTeacherData() {
  return useFetchJson(loadTeacherData)
}
