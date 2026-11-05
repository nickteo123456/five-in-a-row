import { supabaseAdmin, isDevMode } from './supabase'
import { devStore } from './dev-store'
import type { DbQuestion } from '@/types/game'

export interface Attempt {
  user_id: string
  question_id: string
  topic: string
  is_correct: boolean
  created_at: string
}

export interface AttemptWithQuestion extends Attempt {
  question: DbQuestion | null
}

export interface TopicProgress {
  topic: string
  correct: number
  total: number
  accuracy: number
}

export interface MissedQuestionSummary {
  question: DbQuestion
  wrongCount: number
  total: number
}

const MAX_ATTEMPTS = 5000
const HARDEST_QUESTIONS = 10

export function summarizeTopics(
  attempts: Pick<Attempt, 'topic' | 'is_correct'>[]
): TopicProgress[] {
  const topics = new Map<string, { correct: number; total: number }>()

  for (const { topic, is_correct } of attempts) {
    const entry = topics.get(topic) || { correct: 0, total: 0 }
    entry.total += 1
    entry.correct += is_correct ? 1 : 0
    topics.set(topic, entry)
  }

  return Array.from(topics, ([topic, { correct, total }]) => ({
    topic,
    correct,
    total,
    accuracy: Math.round((correct / total) * 100),
  })).sort((a, b) => a.accuracy - b.accuracy)
}

function summarizeQuestions(attempts: AttemptWithQuestion[]) {
  const questions = new Map<string, MissedQuestionSummary & { lastCorrect: boolean }>()

  // Oldest first, so lastCorrect ends up as the most recent result
  const oldestFirst = [...attempts].sort((a, b) => a.created_at.localeCompare(b.created_at))

  for (const attempt of oldestFirst) {
    if (!attempt.question) continue

    const entry = questions.get(attempt.question_id) || {
      question: attempt.question,
      wrongCount: 0,
      total: 0,
      lastCorrect: false,
    }

    entry.total += 1
    entry.wrongCount += attempt.is_correct ? 0 : 1
    entry.lastCorrect = attempt.is_correct
    questions.set(attempt.question_id, entry)
  }

  return Array.from(questions.values())
}

// A question leaves the review list once the student's latest answer is right.
export function findQuestionsToReview(attempts: AttemptWithQuestion[]): MissedQuestionSummary[] {
  return summarizeQuestions(attempts)
    .filter(({ wrongCount, lastCorrect }) => wrongCount > 0 && !lastCorrect)
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .map(({ question, wrongCount, total }) => ({ question, wrongCount, total }))
}

export function findHardestQuestions(attempts: AttemptWithQuestion[]): MissedQuestionSummary[] {
  return summarizeQuestions(attempts)
    .filter(({ wrongCount }) => wrongCount > 0)
    .sort((a, b) => b.wrongCount / b.total - a.wrongCount / a.total || b.total - a.total)
    .slice(0, HARDEST_QUESTIONS)
    .map(({ question, wrongCount, total }) => ({ question, wrongCount, total }))
}

async function findQuestion(questionId: string): Promise<DbQuestion | null> {
  if (isDevMode) return devStore.questions.get(questionId) || null

  const { data } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .maybeSingle()

  return data
}

// Grades the answer against the stored question rather than trusting the client.
export async function saveAttempt(
  userId: string,
  questionId: string,
  answer: string | number
): Promise<{ isCorrect: boolean } | null> {
  const question = await findQuestion(questionId)
  if (!question) return null

  const attempt: Attempt = {
    user_id: userId,
    question_id: question.id,
    topic: question.topic,
    is_correct: question.correct_answer === answer,
    created_at: new Date().toISOString(),
  }

  if (isDevMode) {
    devStore.attempts.push(attempt)
    return { isCorrect: attempt.is_correct }
  }

  const { error } = await supabaseAdmin.from('question_attempts').insert(attempt)
  if (error) throw error

  return { isCorrect: attempt.is_correct }
}

export async function listAttempts(userId?: string): Promise<AttemptWithQuestion[]> {
  if (isDevMode) {
    return devStore.attempts
      .filter((attempt) => !userId || attempt.user_id === userId)
      .map((attempt) => ({
        ...attempt,
        question: devStore.questions.get(attempt.question_id) || null,
      }))
  }

  let query = supabaseAdmin
    .from('question_attempts')
    .select('user_id, question_id, topic, is_correct, created_at, question:questions(*)')
    .order('created_at', { ascending: false })
    .limit(MAX_ATTEMPTS)

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw error

  return (data || []) as unknown as AttemptWithQuestion[]
}
