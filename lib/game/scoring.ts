import type { Answer, Difficulty, Question } from '@/types/game'

const POINTS: Record<Difficulty, number> = {
  beginner: 10,
  intermediate: 15,
  advanced: 20,
}

export function pointsForDifficulty(difficulty: Difficulty): number {
  return POINTS[difficulty]
}

function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, ' ')
}

export function isCorrectAnswer(question: Question, answer: Answer): boolean {
  if (typeof question.correctAnswer === 'string' && typeof answer === 'string') {
    return normalizeCode(question.correctAnswer) === normalizeCode(answer)
  }

  return question.correctAnswer === answer
}
