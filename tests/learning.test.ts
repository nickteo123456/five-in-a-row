import { describe, expect, it } from 'vitest'
import { evaluateAchievements } from '@/lib/achievements'
import {
  findHardestQuestions,
  findQuestionsToReview,
  summarizeTopics,
  type AttemptWithQuestion,
} from '@/lib/learning'
import type { DbQuestion } from '@/types/game'

const question = (id: string) => ({ id, topic: 'Loops' }) as DbQuestion

const attempt = (id: string, isCorrect: boolean, minute: number): AttemptWithQuestion => ({
  user_id: 'user',
  question_id: id,
  topic: 'Loops',
  is_correct: isCorrect,
  created_at: `2026-01-01T10:${String(minute).padStart(2, '0')}:00.000Z`,
  question: question(id),
})

describe('summarizeTopics', () => {
  it('calculates accuracy and puts the weakest topic first', () => {
    const topics = summarizeTopics([
      { topic: 'Lists', is_correct: true },
      { topic: 'Loops', is_correct: true },
      { topic: 'Loops', is_correct: false },
    ])

    expect(topics).toEqual([
      { topic: 'Loops', correct: 1, total: 2, accuracy: 50 },
      { topic: 'Lists', correct: 1, total: 1, accuracy: 100 },
    ])
  })
})

describe('findQuestionsToReview', () => {
  it('lists questions whose latest answer was wrong', () => {
    const review = findQuestionsToReview([attempt('a', false, 1), attempt('a', false, 2)])

    expect(review).toHaveLength(1)
    expect(review[0].wrongCount).toBe(2)
  })

  it('clears a question once the latest answer is right', () => {
    expect(findQuestionsToReview([attempt('a', true, 2), attempt('a', false, 1)])).toEqual([])
  })

  it('brings a question back if it is missed again', () => {
    const attempts = [attempt('a', false, 1), attempt('a', true, 2), attempt('a', false, 3)]
    expect(findQuestionsToReview(attempts)).toHaveLength(1)
  })

  it('skips attempts whose question was deleted', () => {
    expect(findQuestionsToReview([{ ...attempt('a', false, 1), question: null }])).toEqual([])
  })
})

describe('findHardestQuestions', () => {
  it('ranks by wrong rate', () => {
    const hardest = findHardestQuestions([
      attempt('easy', false, 1),
      attempt('easy', true, 2),
      attempt('easy', true, 3),
      attempt('hard', false, 4),
      attempt('hard', false, 5),
    ])

    expect(hardest.map(({ question: { id } }) => id)).toEqual(['hard', 'easy'])
  })
})

describe('evaluateAchievements', () => {
  const stats = {
    totalMatches: 1,
    wins: 1,
    highestScore: 40,
    totalCorrect: 60,
    topicsPractised: 2,
  }

  it('unlocks reached goals and reports progress on others', () => {
    const byId = Object.fromEntries(evaluateAchievements(stats).map((item) => [item.id, item]))

    expect(byId.firstWin.isUnlocked).toBe(true)
    expect(byId.fiftyCorrect.isUnlocked).toBe(true)
    expect(byId.tenWins).toMatchObject({ isUnlocked: false, value: 1, goal: 10 })
  })

  it('caps progress at the goal', () => {
    const byId = Object.fromEntries(evaluateAchievements(stats).map((item) => [item.id, item]))
    expect(byId.fiftyCorrect.value).toBe(50)
  })
})
