-- Add new columns to match_history table for better tracking
-- Run this migration to add opponent information and win/loss tracking

-- Add columns if they don't exist
ALTER TABLE match_history 
ADD COLUMN IF NOT EXISTS opponent_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS opponent_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_match_history_user_winner ON match_history(user_id, is_winner);
CREATE INDEX IF NOT EXISTS idx_match_history_completed ON match_history(completed_at DESC);

-- Comment the columns
COMMENT ON COLUMN match_history.opponent_name IS 'Name of the opponent player';
COMMENT ON COLUMN match_history.opponent_score IS 'Score of the opponent player';
COMMENT ON COLUMN match_history.is_winner IS 'Whether this player won the match';

