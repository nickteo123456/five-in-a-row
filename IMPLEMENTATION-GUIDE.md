# Questions Database & Play Again Feature - Implementation Guide

## ✅ COMPLETED (Part 1/4)

### 1. Database Schema
- **File**: `database-questions.sql`
- Created `questions` table with all fields
- **50 Python MCQ questions** already inserted
- Topics covered: basics, functions, operators, data types, control flow, loops, strings, lists, etc.
- All questions are beginner level, multiple choice (A, B, C, D)

### 2. API Routes
- **GET** `/api/questions` - Fetch all questions or random questions
  - Use `?random=true&count=10` to get 10 random questions
- **POST** `/api/questions` - Create new question
- **PUT** `/api/questions/[id]` - Update existing question
- **DELETE** `/api/questions/[id]` - Soft delete question
- Dev mode support included

## 🔄 TO DO (Parts 2-4)

### Part 2: Game Provider Modifications

**File to modify**: `components/game-provider.tsx`

#### Changes needed:

1. **Remove hardcoded questions** (lines 64-114)
```typescript
// DELETE this entire array:
const pythonFunctionsQuestions: Question[] = [...]
```

2. **Add state for questions**
```typescript
const [questions, setQuestions] = useState<Question[]>([])
const [questionIndex, setQuestionIndex] = useState(0)
```

3. **Add function to fetch random questions**
```typescript
const fetchRandomQuestions = async (count: number = 20) => {
  try {
    const response = await fetch(`/api/questions?random=true&count=${count}`)
    const { questions } = await response.json()
    
    // Convert database format to game format
    const formattedQuestions = questions.map((q: any) => ({
      id: q.id,
      type: "multiple-choice",
      question: q.question,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic
    }))
    
    setQuestions(formattedQuestions)
    return formattedQuestions
  } catch (error) {
    console.error('Error fetching questions:', error)
    return []
  }
}
```

4. **Modify createLobby** to fetch questions when game starts
```typescript
const createLobby = async (userId: string, userName: string) => {
  // ... existing code ...
  
  // Fetch random questions for this game
  const gameQuestions = await fetchRandomQuestions(20)
  if (gameQuestions.length > 0) {
    setGameState(prev => ({
      ...prev,
      currentQuestion: gameQuestions[0]
    }))
  }
  
  // ... rest of code ...
}
```

5. **Modify nextQuestion** to use fetched questions
```typescript
const nextQuestion = () => {
  if (questions.length === 0) return
  
  const nextIndex = (questionIndex + 1) % questions.length
  setQuestionIndex(nextIndex)
  setGameState((prev) => ({
    ...prev,
    currentQuestion: questions[nextIndex],
  }))
}
```

### Part 3: Play Again Request System

**Files to modify**: 
- `components/game-provider.tsx`
- `components/game-dashboard.tsx`
- `app/api/lobby/[lobbyId]/route.ts`

#### Database changes needed:

Add to `game_lobbies` table:
```sql
ALTER TABLE game_lobbies ADD COLUMN IF NOT EXISTS play_again_request_from UUID;
ALTER TABLE game_lobbies ADD COLUMN IF NOT EXISTS play_again_status VARCHAR(20) DEFAULT 'none' CHECK (play_again_status IN ('none', 'pending', 'accepted', 'rejected'));
```

#### Game Provider changes:

1. **Add play again request functions**
```typescript
const requestPlayAgain = async (lobbyId: string, userId: string) => {
  try {
    await fetch(`/api/lobby/${lobbyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        play_again_request_from: userId,
        play_again_status: 'pending'
      })
    })
  } catch (error) {
    console.error('Error requesting play again:', error)
  }
}

const respondPlayAgain = async (lobbyId: string, accept: boolean) => {
  try {
    await fetch(`/api/lobby/${lobbyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        play_again_status: accept ? 'accepted' : 'rejected'
      })
    })
    
    if (accept) {
      // Reset game state for new game
      // Fetch new random questions
      const newQuestions = await fetchRandomQuestions(20)
      setQuestions(newQuestions)
      
      // Reset board and scores
      resetBoard()
      
      // Reset lobby state on server
      await fetch(`/api/lobby/${lobbyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          board_state: createEmptyBoard(),
          current_turn: 'X',
          host_score: 0,
          guest_score: 0,
          host_can_place: false,
          guest_can_place: false,
          winner_id: null,
          current_question_index: 0,
          play_again_request_from: null,
          play_again_status: 'none'
        })
      })
    }
  } catch (error) {
    console.error('Error responding to play again:', error)
  }
}
```

2. **Add to GameContextType**
```typescript
interface GameContextType {
  // ... existing fields ...
  requestPlayAgain: (lobbyId: string, userId: string) => Promise<void>
  respondPlayAgain: (lobbyId: string, accept: boolean) => Promise<void>
}
```

3. **Monitor play again requests in syncLobbyState**
```typescript
// Inside syncLobbyState, after updating game state:
if (lobby.play_again_status === 'pending' && lobby.play_again_request_from !== user?.id) {
  // Show dialog to other player
  toast.info('Play Again Request', {
    description: `${opponentName} wants to play again!`,
    action: {
      label: 'Accept',
      onClick: () => respondPlayAgain(lobby.id, true)
    }
  })
}

if (lobby.play_again_status === 'rejected' && lobby.play_again_request_from === user?.id) {
  toast.error('Request Rejected', {
    description: 'Your opponent declined to play again'
  })
  // Return to main menu after 2 seconds
  setTimeout(() => {
    leaveGame()
    router.push('/')
  }, 2000)
}

if (lobby.play_again_status === 'accepted') {
  // Both players automatically restart
  toast.success('Starting New Game!')
}
```

#### Game Dashboard changes:

**File**: `components/game-dashboard.tsx`

Modify the victory/defeat dialog buttons:

```typescript
<Button
  onClick={async () => {
    if (gameState.gameMode === "online" && gameState.lobbyId && user) {
      // Request play again instead of direct reset
      await requestPlayAgain(gameState.lobbyId, user.id)
      toast.info('Request sent', {
        description: 'Waiting for opponent response...'
      })
    } else {
      resetBoard()
    }
  }}
  className="bg-primary hover:bg-primary/90 glow-primary font-mono"
>
  <RotateCcw className="h-4 w-4 mr-2" />
  PLAY.AGAIN
</Button>
```

### Part 4: Teacher Dashboard UI

**File to create**: `app/teacher/questions/page.tsx`

Create a full CRUD interface:
1. List all questions with search/filter
2. Add new question form
3. Edit existing questions
4. Delete questions
5. Preview questions as they appear in game

This is a large UI component that would require:
- Table component for listing questions
- Form component for add/edit
- Confirmation dialogs for delete
- Toast notifications for success/error

## 🗄️ Database Setup Instructions

1. **Open your Supabase dashboard**
2. Go to **SQL Editor**
3. Run the `database-questions.sql` file
4. This will:
   - Create the questions table
   - Insert all 50 Python MCQ questions
   - Create necessary indexes

## ✅ Testing Steps

After implementing all parts:

1. **Test Questions API**:
   - Visit `/api/questions?random=true&count=5`
   - Should return 5 random questions

2. **Test Game**:
   - Start online multiplayer
   - Questions should be different each game
   - Questions should appear randomly

3. **Test Play Again**:
   - Finish a game
   - Click "PLAY AGAIN" on winner/loser dialog
   - Other player should see request toast
   - Accept → New game starts with new questions
   - Reject → Both return to main menu

## 📝 Notes

- All 50 questions are already in `database-questions.sql`
- Questions are beginner level Python MCQs
- Topics cover fundamentals, functions, data types, control flow, etc.
- Teacher UI would allow adding more questions through the web interface

## 🚀 Priority Implementation Order

1. ✅ Database & API (DONE)
2. ⏭️ Game Provider modifications (fetch questions from DB)
3. ⏭️ Play Again request system
4. ⏭️ Teacher Dashboard UI

Would you like me to implement any specific part next?

