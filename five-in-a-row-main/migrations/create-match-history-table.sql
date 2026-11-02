-- Create match_history table with all necessary columns
-- Drop existing table if needed and create fresh

-- Drop existing table (CAUTION: This will delete all existing data!)
DROP TABLE IF EXISTS match_history CASCADE;

-- Create new match_history table
CREATE TABLE match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  game_mode VARCHAR(50) DEFAULT 'multiplayer',
  duration INTEGER DEFAULT 0,
  opponent_name VARCHAR(255),
  opponent_score INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_match_history_user_id ON match_history(user_id);
CREATE INDEX idx_match_history_user_winner ON match_history(user_id, is_winner);
CREATE INDEX idx_match_history_completed ON match_history(completed_at DESC);
CREATE INDEX idx_match_history_game_mode ON match_history(game_mode);

-- Add comments for documentation
COMMENT ON TABLE match_history IS 'Stores individual match/game history for all users';
COMMENT ON COLUMN match_history.id IS 'Unique identifier for the match';
COMMENT ON COLUMN match_history.user_id IS 'Reference to the user who played';
COMMENT ON COLUMN match_history.score IS 'Score achieved by the user in this match';
COMMENT ON COLUMN match_history.correct_answers IS 'Number of correct answers';
COMMENT ON COLUMN match_history.total_questions IS 'Total number of questions attempted';
COMMENT ON COLUMN match_history.game_mode IS 'Game mode (multiplayer, online, single)';
COMMENT ON COLUMN match_history.duration IS 'Match duration in seconds';
COMMENT ON COLUMN match_history.opponent_name IS 'Name of the opponent player';
COMMENT ON COLUMN match_history.opponent_score IS 'Score achieved by the opponent';
COMMENT ON COLUMN match_history.is_winner IS 'Whether this user won the match';
COMMENT ON COLUMN match_history.completed_at IS 'When the match was completed';

-- Enable Row Level Security (RLS)
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own match history
CREATE POLICY "Users can view own match history"
  ON match_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own match history
CREATE POLICY "Users can insert own match history"
  ON match_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view all match history
CREATE POLICY "Teachers can view all match history"
  ON match_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

