import type { DbQuestion, Question, QuestionFilter } from '@/types/game'

// How many other questions come up before a missed question is asked again
export const RETRY_GAP = 3

export function toGameQuestion(dbQuestion: DbQuestion): Question {
  return {
    id: dbQuestion.id,
    type: 'multiple-choice',
    question: dbQuestion.question,
    options: [dbQuestion.option_a, dbQuestion.option_b, dbQuestion.option_c, dbQuestion.option_d],
    correctAnswer: dbQuestion.correct_answer,
    explanation: dbQuestion.explanation,
    difficulty: dbQuestion.difficulty || 'beginner',
    topic: dbQuestion.topic || 'Python',
  }
}

export function filterQuestions(questions: Question[], filter?: QuestionFilter): Question[] {
  if (!filter) return questions

  const matches = questions.filter(
    (question) =>
      (filter.difficulty === 'all' || question.difficulty === filter.difficulty) &&
      (filter.topic === 'all' || question.topic === filter.topic)
  )

  return matches.length > 0 ? matches : questions
}

export function listTopics(questions: Question[]): string[] {
  return Array.from(new Set(questions.map((question) => question.topic))).sort()
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

// Takes the next question, moving it to the back so the queue never runs out.
export function advanceQueue(queue: Question[]): { question: Question | null; queue: Question[] } {
  const [question, ...rest] = queue

  return question ? { question, queue: [...rest, question] } : { question: null, queue }
}

// Brings a missed question back after a few others instead of at the very end.
export function retryMissedQuestion(queue: Question[], missed: Question): Question[] {
  const rest = queue.filter((question) => question.id !== missed.id)
  const position = Math.min(RETRY_GAP, rest.length)

  return [...rest.slice(0, position), missed, ...rest.slice(position)]
}

// Used when the question bank can't be loaded
export const fallbackQuestions: Question[] = [
  {
    id: 'fallback-1',
    type: 'multiple-choice',
    question: 'Which keyword is used to define a function in Python?',
    options: ['function', 'def', 'define', 'func'],
    correctAnswer: 1,
    explanation: 'The "def" keyword is used to define functions in Python.',
    difficulty: 'beginner',
    topic: 'Function Definition',
  },
  {
    id: 'fallback-2',
    type: 'code-completion',
    question: 'Complete this function to return the sum of two numbers:',
    code: 'def add_numbers(a, b):\n    # Complete this function\n    ____',
    correctAnswer: 'return a + b',
    explanation: 'Functions use the return statement to send back a value to the caller.',
    difficulty: 'beginner',
    topic: 'Return Values',
  },
  {
    id: 'fallback-3',
    type: 'multiple-choice',
    question:
      'What will this function return?\n\ndef mystery_func(x=5):\n    return x * 2\n\nresult = mystery_func()',
    options: ['5', '10', '0', 'Error'],
    correctAnswer: 1,
    explanation:
      'The function uses a default parameter value of 5, so mystery_func() returns 5 * 2 = 10.',
    difficulty: 'intermediate',
    topic: 'Default Parameters',
  },
  {
    id: 'fallback-4',
    type: 'true-false',
    question: 'Variables defined inside a function are accessible from outside the function.',
    correctAnswer: 0,
    explanation:
      'Variables defined inside a function have local scope and are not accessible outside the function.',
    difficulty: 'intermediate',
    topic: 'Function Scope',
  },
  {
    id: 'fallback-5',
    type: 'multiple-choice',
    question: 'Which built-in function returns the length of a list?',
    options: ['size()', 'length()', 'len()', 'count()'],
    correctAnswer: 2,
    explanation: 'The len() function returns the number of items in a sequence or collection.',
    difficulty: 'beginner',
    topic: 'Built-in Functions',
  },
]
