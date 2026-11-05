import { describe, expect, it } from 'vitest'
import {
  advanceQueue,
  fallbackQuestions,
  filterQuestions,
  listTopics,
  retryMissedQuestion,
  shuffle,
  toGameQuestion,
} from '@/lib/game/questions'
import { isCorrectAnswer, pointsForDifficulty } from '@/lib/game/scoring'
import type { Question } from '@/types/game'

const question = (id: string, overrides: Partial<Question> = {}): Question => ({
  id,
  type: 'multiple-choice',
  question: id,
  options: ['a', 'b', 'c', 'd'],
  correctAnswer: 1,
  explanation: '',
  difficulty: 'beginner',
  topic: 'Loops',
  ...overrides,
})

describe('scoring', () => {
  it('gives more points for harder questions', () => {
    expect(pointsForDifficulty('beginner')).toBe(10)
    expect(pointsForDifficulty('intermediate')).toBe(15)
    expect(pointsForDifficulty('advanced')).toBe(20)
  })

  it('compares multiple choice answers by index', () => {
    expect(isCorrectAnswer(question('q'), 1)).toBe(true)
    expect(isCorrectAnswer(question('q'), 2)).toBe(false)
  })

  it('ignores spacing in code answers', () => {
    const code = question('q', { type: 'code-completion', correctAnswer: 'return a + b' })

    expect(isCorrectAnswer(code, '  return   a + b ')).toBe(true)
    expect(isCorrectAnswer(code, 'return a - b')).toBe(false)
  })
})

describe('toGameQuestion', () => {
  it('turns a database row into a game question', () => {
    const game = toGameQuestion({
      id: 'id',
      question: 'Q',
      option_a: 'a',
      option_b: 'b',
      option_c: 'c',
      option_d: 'd',
      correct_answer: 2,
      explanation: 'E',
      difficulty: 'advanced',
      topic: 'Loops',
    })

    expect(game.options).toEqual(['a', 'b', 'c', 'd'])
    expect(game.correctAnswer).toBe(2)
    expect(game.type).toBe('multiple-choice')
  })
})

describe('filterQuestions', () => {
  const questions = [
    question('1', { difficulty: 'beginner', topic: 'Loops' }),
    question('2', { difficulty: 'advanced', topic: 'Loops' }),
    question('3', { difficulty: 'advanced', topic: 'Lists' }),
  ]

  it('filters by difficulty and topic', () => {
    const filtered = filterQuestions(questions, { difficulty: 'advanced', topic: 'Loops' })
    expect(filtered.map(({ id }) => id)).toEqual(['2'])
  })

  it('keeps everything for "all"', () => {
    expect(filterQuestions(questions, { difficulty: 'all', topic: 'all' })).toHaveLength(3)
  })

  it('falls back to all questions rather than an empty game', () => {
    const filtered = filterQuestions(questions, { difficulty: 'beginner', topic: 'Lists' })
    expect(filtered).toHaveLength(3)
  })

  it('lists sorted unique topics', () => {
    expect(listTopics(questions)).toEqual(['Lists', 'Loops'])
  })
})

describe('question queue', () => {
  const queue = ['1', '2', '3', '4', '5'].map((id) => question(id))

  it('takes the next question and moves it to the back', () => {
    const { question: next, queue: rest } = advanceQueue(queue)

    expect(next?.id).toBe('1')
    expect(rest.map(({ id }) => id)).toEqual(['2', '3', '4', '5', '1'])
  })

  it('handles an empty queue', () => {
    expect(advanceQueue([]).question).toBeNull()
  })

  it('brings a missed question back after three others', () => {
    const retried = retryMissedQuestion(queue, queue[0])
    expect(retried.map(({ id }) => id)).toEqual(['2', '3', '4', '1', '5'])
  })

  it('works when fewer questions remain than the gap', () => {
    const short = queue.slice(0, 2)
    expect(retryMissedQuestion(short, short[0]).map(({ id }) => id)).toEqual(['2', '1'])
  })
})

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const items = [1, 2, 3, 4]
    const shuffled = shuffle(items, () => 0)

    expect([...shuffled].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4])
  })
})

describe('fallbackQuestions', () => {
  it('is marked so answers are not sent to the server', () => {
    expect(fallbackQuestions.every(({ id }) => id.startsWith('fallback-'))).toBe(true)
  })
})
