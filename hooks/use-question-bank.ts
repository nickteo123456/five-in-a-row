'use client'

import { useEffect, useState } from 'react'
import { fallbackQuestions, toGameQuestion } from '@/lib/game/questions'
import { logger } from '@/lib/logger'
import type { DbQuestion, Question } from '@/types/game'

const MAX_QUESTIONS = 200

export function useQuestionBank(): Question[] {
  const [questions, setQuestions] = useState<Question[]>(fallbackQuestions)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch(`/api/questions?random=true&count=${MAX_QUESTIONS}`)
        if (!response.ok) return

        const data: { questions?: DbQuestion[] } = await response.json()
        if (data.questions?.length) {
          setQuestions(data.questions.map(toGameQuestion))
        }
      } catch (error) {
        logger.error('Error loading questions:', error)
      }
    }

    loadQuestions()
  }, [])

  return questions
}
