'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Clock, Code, Lightbulb, Loader2, Timer, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pointsForDifficulty } from '@/lib/game/scoring'
import type { Answer, Question } from '@/types/game'
import { useAuth } from './auth-provider'
import { useGame } from './game-provider'
import { useI18n } from './i18n-provider'

const NO_ANSWER = -1

const DIFFICULTY_STYLES = {
  beginner: 'bg-accent text-accent-foreground',
  intermediate: 'bg-chart-5 text-black',
  advanced: 'bg-destructive text-white',
}

export function correctAnswerText(question: Question, t: ReturnType<typeof useI18n>['t']): string {
  if (question.type === 'true-false') {
    return t(question.correctAnswer === 1 ? 'quiz.true' : 'quiz.false')
  }

  return typeof question.correctAnswer === 'number'
    ? (question.options?.[question.correctAnswer] ?? '')
    : question.correctAnswer
}

function AnswerTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const { t } = useI18n()
  const [remaining, setRemaining] = useState(seconds)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const timer = setInterval(() => setRemaining((value) => value - 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (remaining <= 0) onExpireRef.current()
  }, [remaining])

  return (
    <div
      className={`flex items-center gap-1.5 text-sm font-mono ${
        remaining <= 10 ? 'text-destructive' : 'text-muted-foreground'
      }`}
    >
      <Timer className="h-4 w-4" />
      {t('quiz.secondsLeft', { seconds: Math.max(remaining, 0) })}
    </div>
  )
}

function QuizPanel({ question }: { question: Question }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { gameState, answerQuestion, handleContinueAfterWrongAnswer, completePhysicalPlacement } =
    useGame()
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null)

  const { gameMode, currentPlayer, players, isComputerThinking, canPlacePiece } = gameState
  const isPhysical = gameState.boardMode === 'physical'
  const isOnlineMyTurn = currentPlayer?.id === user?.id
  const isMyTurn = gameMode === 'online' ? isOnlineMyTurn : !currentPlayer?.isComputer
  const opponent = players.find((player) => player.id !== user?.id)

  const submit = async (answer: Answer, isTimeout = false) => {
    const isCorrect = await answerQuestion(answer)
    setResult(isCorrect ? 'correct' : isTimeout ? 'timeout' : 'wrong')
  }

  const handleSubmit = () => {
    const answer = question.type === 'code-completion' ? textAnswer : selectedAnswer
    if (answer !== null && answer !== '') submit(answer)
  }

  if (isComputerThinking) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin" />
        {t('game.computerThinking')}
      </div>
    )
  }

  if (!isMyTurn && gameMode === 'online') {
    return (
      <div className="py-10 text-center">
        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-pulse" />
        <div className="font-bold text-lg">{t('quiz.waitingTitle')}</div>
        <p className="text-muted-foreground">
          {t('quiz.waitingBody', { name: opponent?.name || '', piece: opponent?.piece || '' })}
        </p>
      </div>
    )
  }

  if (result) {
    const isCorrect = result === 'correct'

    return (
      <div className="space-y-3">
        <div
          role="status"
          className={`p-3 rounded-lg flex items-center gap-3 border ${
            isCorrect
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {isCorrect ? (
            <CheckCircle className="h-7 w-7 shrink-0" />
          ) : (
            <XCircle className="h-7 w-7 shrink-0" />
          )}
          <div>
            <div className="font-bold text-lg">
              {isCorrect
                ? t('quiz.correct', { points: pointsForDifficulty(question.difficulty) })
                : t(result === 'timeout' ? 'quiz.timeUp' : 'quiz.incorrect')}
            </div>
            <div className="text-sm opacity-90">
              {isCorrect
                ? isPhysical
                  ? t('quiz.correctRealBoard', { piece: currentPlayer?.piece || '' })
                  : t('quiz.correctPlace')
                : t('quiz.incorrectNext')}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-secondary/40 bg-secondary/10 space-y-2">
          {!isCorrect && (
            <p className="font-semibold">
              {t('quiz.correctAnswerWas', { answer: correctAnswerText(question, t) })}
            </p>
          )}
          <div className="flex items-center gap-2 text-secondary font-bold">
            <Lightbulb className="h-4 w-4" />
            {t('quiz.explanation')}
          </div>
          <p className="text-base leading-relaxed">{question.explanation}</p>
        </div>

        {!isCorrect && (
          <Button onClick={handleContinueAfterWrongAnswer} className="w-full">
            {t('common.continue')}
          </Button>
        )}
        {isCorrect && isPhysical && canPlacePiece && (
          <Button onClick={completePhysicalPlacement} className="w-full">
            {t('quiz.nextTurn')}
          </Button>
        )}
      </div>
    )
  }

  const canSubmit =
    question.type === 'code-completion' ? textAnswer.trim() !== '' : selectedAnswer !== null

  return (
    <div className="space-y-3">
      {gameState.questionTimeLimit && (
        <AnswerTimer
          seconds={gameState.questionTimeLimit}
          onExpire={() => submit(NO_ANSWER, true)}
        />
      )}

      <p className="text-base leading-relaxed whitespace-pre-wrap">{question.question}</p>

      {question.code && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 font-mono text-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 mb-2 text-primary text-xs">
            <Code className="h-3 w-3" />
            {t('quiz.code')}
          </div>
          <pre>{question.code}</pre>
        </div>
      )}

      {question.type === 'multiple-choice' && (
        <div className="space-y-2">
          {question.options?.map((option, index) => (
            <Button
              key={option}
              variant="outline"
              aria-pressed={selectedAnswer === index}
              onClick={() => setSelectedAnswer(index)}
              className={`w-full justify-start text-left h-auto min-h-11 whitespace-normal py-2 font-mono ${
                selectedAnswer === index ? 'border-primary bg-primary/20' : 'border-primary/30'
              }`}
            >
              <span className="mr-3 font-bold text-accent">{String.fromCharCode(65 + index)}.</span>
              {option}
            </Button>
          ))}
        </div>
      )}

      {question.type === 'true-false' && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 1, label: t('quiz.true') },
            { value: 0, label: t('quiz.false') },
          ].map(({ value, label }) => (
            <Button
              key={value}
              variant="outline"
              aria-pressed={selectedAnswer === value}
              onClick={() => setSelectedAnswer(value)}
              className={`h-11 ${selectedAnswer === value ? 'border-primary bg-primary/20' : ''}`}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {question.type === 'code-completion' && (
        <div className="space-y-1.5">
          <label htmlFor="codeAnswer" className="text-sm font-medium">
            {t('quiz.yourAnswer')}
          </label>
          <Input
            id="codeAnswer"
            placeholder={t('quiz.codePlaceholder')}
            value={textAnswer}
            onChange={(event) => setTextAnswer(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
          />
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full h-11">
        {t('quiz.submit')}
      </Button>
    </div>
  )
}

export function QuizInterface() {
  const { t } = useI18n()
  const { gameState } = useGame()
  const question = gameState.currentQuestion

  if (!question) return null

  const moveCount = gameState.board.flat().filter(Boolean).length
  const isVersus = gameState.players.length === 2

  return (
    <section className="rounded-xl border border-primary/30 bg-card/90 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-primary">{t('quiz.title')}</h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={DIFFICULTY_STYLES[question.difficulty]}>
            {t(`difficulty.${question.difficulty}`)}
          </Badge>
          <Badge variant="outline" className="border-secondary/50 text-secondary">
            {question.topic}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(isVersus ? 'quiz.ruleVersus' : 'quiz.rule')}
      </p>

      {/* A new key clears the selected answer whenever the turn moves on */}
      <QuizPanel key={`${question.id}-${gameState.currentTurn}-${moveCount}`} question={question} />
    </section>
  )
}
