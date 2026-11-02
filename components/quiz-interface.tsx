"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CheckCircle, XCircle, Code, Lightbulb, Cpu, User, Clock } from "lucide-react"
import { useGame } from "./game-provider"
import { useAuth } from "./auth-provider"

export function QuizInterface() {
  const { gameState, answerQuestion, handleContinueAfterWrongAnswer, completePhysicalPlacement } = useGame()
  const { user } = useAuth()
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [textAnswer, setTextAnswer] = useState("")

  const question = gameState.currentQuestion
  if (!question) return null

  const isPhysicalMode = gameState.boardMode === "physical"
  const correctTitle = isPhysicalMode ? "CORRECT! PLACE YOUR PHYSICAL PIECE" : "CORRECT! PLACE YOUR PIECE"
  const correctSubtitle = isPhysicalMode
    ? "Tap NEXT TURN after placing your piece on the physical board"
    : "Click on the board to place"

  // Check if it's the current user's turn
  // For local multiplayer, we always consider it "my turn" since both players share the same device
  // For online mode, we check if the user ID matches the current player
  const isMyTurn = gameState.gameMode === "single" || 
                   gameState.gameMode === "multiplayer" || // In local multiplayer, always true
                   (gameState.currentPlayer && user && gameState.currentPlayer.id === user.id)
  
  // Find the current user's player object to know their piece
  // In local multiplayer, use currentPlayer since both players share same user account
  const myPlayer = gameState.gameMode === "multiplayer" 
    ? gameState.currentPlayer 
    : gameState.players.find(p => p.id === user?.id)
  const opponentPlayer = gameState.gameMode === "multiplayer"
    ? gameState.players.find(p => p.id !== gameState.currentPlayer?.id)
    : gameState.players.find(p => p.id !== user?.id)

  // Auto-clear result when it's no longer the player's turn (only for correct answers)
  // For wrong answers, keep showing until they click continue
  useEffect(() => {
    if (!isMyTurn && showResult && isCorrect) {
      setShowResult(false)
      setSelectedAnswer(null)
      setTextAnswer("")
    }
  }, [isMyTurn, showResult, isCorrect])

  // For local multiplayer, clear answers when the turn changes
  // This prevents the next player from seeing the previous player's selected answer
  useEffect(() => {
    if (gameState.gameMode === "multiplayer" && !gameState.canPlacePiece) {
      setShowResult(false)
      setSelectedAnswer(null)
      setTextAnswer("")
    }
  }, [gameState.currentTurn, gameState.gameMode, gameState.canPlacePiece])

  const handleSubmit = async () => {
    const answer = question.type === "code-completion" ? textAnswer : selectedAnswer
    if (answer === null || answer === "") return

    const correct = await answerQuestion(answer)
    setIsCorrect(correct)
    setShowResult(true)
  }

  const handleContinue = () => {
    setSelectedAnswer(null)
    setTextAnswer("")
    setShowResult(false)
    
    // If this was a wrong answer in multiplayer, trigger the turn switch now
    if (!isCorrect && gameState.pendingTurnSwitch) {
      handleContinueAfterWrongAnswer()
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-accent text-accent-foreground"
      case "intermediate":
        return "bg-chart-5 text-chart-5-foreground"
      case "advanced":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className="cyber-border glow-primary h-full lg:h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0">
        {/* Turn Indicator for Multiplayer/Online */}
        {(gameState.gameMode === "multiplayer" || gameState.gameMode === "online") && gameState.currentPlayer && (
          <div className="mb-2 p-2 rounded-lg border-2 border-primary/40 bg-primary/10 cyber-border">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div className="flex-1 font-mono">
                <div className="text-primary font-semibold text-sm">
                  {gameState.currentPlayer.name}'s Turn
                </div>
                <div className="text-xs text-muted-foreground">
                  {gameState.currentPlayer.piece} | Score: {gameState.currentPlayer.score}
                </div>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary font-mono text-sm px-2 py-0.5">
                {gameState.currentPlayer.piece}
              </Badge>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <CardTitle className="font-mono text-primary text-base">NEURAL.CHALLENGE</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={`${getDifficultyColor(question.difficulty)} font-mono text-xs`}>
              {question.difficulty.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="border-secondary/30 text-secondary font-mono text-xs">
              {question.topic.toUpperCase()}
            </Badge>
          </div>
        </div>
        <CardDescription className="font-mono text-muted-foreground text-xs">
          {(gameState.gameMode === "multiplayer" || gameState.gameMode === "online")
            ? "Answer correctly to place. Wrong answer = turn switch!" 
            : "Answer correctly to place your piece"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3 p-4 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {/* For local multiplayer, hide question when piece can be placed to prevent the next player from seeing it */}
          {/* For online mode, show waiting message when it's not the player's turn */}
          {gameState.canPlacePiece && !showResult ? (
            isPhysicalMode ? (
              <div className="cyber-border p-4 rounded-lg bg-primary/10 border-primary/40 glow-primary text-center space-y-3">
                <div className="text-primary font-bold text-lg font-mono">✓ CORRECT ANSWER!</div>
                <div className="text-muted-foreground font-mono text-sm">
                  Place your <span className="text-primary font-bold">{myPlayer?.piece || gameState.currentTurn}</span> piece on the physical board.
                </div>
                <Button
                  onClick={completePhysicalPlacement}
                  className="bg-primary hover:bg-primary/90 glow-primary font-mono text-xs px-4 py-2"
                >
                  NEXT TURN
                </Button>
              </div>
            ) : (
              <div className="cyber-border p-4 rounded-lg bg-primary/10 border-primary/40 glow-primary text-center">
                <div className="text-primary font-bold text-lg font-mono mb-2">✓ CORRECT ANSWER!</div>
                <div className="text-muted-foreground font-mono text-sm">
                  Click on the board to place your <span className="text-primary font-bold">{myPlayer?.piece || gameState.currentTurn}</span> piece
                </div>
              </div>
            )
          ) : !isMyTurn && gameState.gameMode === "online" ? (
            <div className="cyber-border p-6 rounded-lg bg-muted/20 border-muted-foreground/30 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <div className="text-muted-foreground font-bold text-lg font-mono mb-2">
                WAITING FOR OPPONENT
              </div>
              <div className="text-muted-foreground font-mono text-sm mb-3">
                {opponentPlayer?.name} ({opponentPlayer?.piece}) is answering...
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                It will be your turn after they place their piece
              </div>
            </div>
          ) : isMyTurn && !showResult && (
            <>
              <p className="text-sm text-card-foreground leading-tight">{question.question}</p>

              {question.code && (
                <div className="cyber-border p-3 rounded-lg bg-muted/30 font-mono text-xs">
                  <div className="flex items-center gap-1.5 mb-2 text-primary">
                    <Code className="h-3 w-3" />
                    <span className="text-xs">CODE</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-card-foreground leading-tight">{question.code}</pre>
                </div>
              )}
            </>
          )}

          {!showResult && !gameState.canPlacePiece && isMyTurn && (
            <div className="space-y-6">
              {question.type === "multiple-choice" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === index ? "default" : "outline"}
                      className={`w-full justify-start text-left h-auto p-2.5 font-mono transition-all text-sm ${
                        selectedAnswer === index
                          ? "glow-primary bg-primary/20 border-primary/40 text-foreground"
                          : "cyber-border hover:border-accent/30 hover:bg-accent/5 hover:text-foreground text-foreground"
                      }`}
                      onClick={() => setSelectedAnswer(index)}
                    >
                      <span className="mr-3 font-bold text-accent text-xs">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {question.type === "true-false" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedAnswer === 1 ? "default" : "outline"}
                    className={`h-10 font-mono text-sm transition-all ${
                      selectedAnswer === 1
                        ? "glow-accent bg-accent/20 border-accent/40 text-foreground"
                        : "cyber-border hover:border-accent/30 hover:text-foreground text-foreground"
                    }`}
                    onClick={() => setSelectedAnswer(1)}
                  >
                    TRUE
                  </Button>
                  <Button
                    variant={selectedAnswer === 0 ? "default" : "outline"}
                    className={`h-10 font-mono text-sm transition-all ${
                      selectedAnswer === 0
                        ? "glow-destructive bg-destructive/20 border-destructive/40 text-foreground"
                        : "cyber-border hover:border-destructive/30 hover:text-foreground text-foreground"
                    }`}
                    onClick={() => setSelectedAnswer(0)}
                  >
                    FALSE
                  </Button>
                </div>
              )}

              {question.type === "code-completion" && (
                <div className="space-y-3">
                  <label className="text-sm font-mono text-primary">NEURAL.INPUT:</label>
                  <Input
                    placeholder="Enter your code solution..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    className="cyber-border font-mono bg-input/50 focus:glow-primary"
                  />
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  !isMyTurn ||
                  (question.type === "code-completion" && !textAnswer.trim()) ||
                  (question.type !== "code-completion" && selectedAnswer === null)
                }
                className="w-full bg-primary hover:bg-primary/90 glow-primary font-mono text-sm py-2.5"
              >
                EXECUTE.ANSWER
              </Button>
            </div>
          )}

          {showResult && isMyTurn && (
            <div className="space-y-3">
              <div
                className={`cyber-border p-3 rounded-lg flex items-center gap-3 ${
                  isCorrect
                    ? "border-accent/40 bg-accent/10 glow-accent"
                    : "border-destructive/40 bg-destructive/10 glow-destructive"
                }`}
              >
                {isCorrect ? (
                  <CheckCircle className="h-8 w-8 text-accent" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
                <div>
                  <div className={`font-bold text-lg font-mono ${isCorrect ? "text-accent" : "text-destructive"}`}>
                    {isCorrect ? correctTitle : "INCORRECT! TRY AGAIN"}
                  </div>
                  <div className={`text-sm font-mono ${isCorrect ? "text-accent/80" : "text-destructive/80"}`}>
                    {isCorrect
                      ? `+${question.difficulty === "beginner" ? 10 : question.difficulty === "intermediate" ? 15 : 20} PTS • ${correctSubtitle}`
                      : "Answer another question to continue"}
                  </div>
                </div>
              </div>

              <div className="cyber-border p-3 rounded-lg border-secondary/40 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-secondary" />
                  <span className="font-bold text-secondary font-mono text-sm">EXPLANATION</span>
                </div>
                <p className="text-card-foreground text-xs leading-tight">{question.explanation}</p>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/90 glow-primary font-mono text-sm py-2.5"
              >
                CONTINUE
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
