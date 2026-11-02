-- Create match_history table to track student game sessions
-- This table stores game results and references the users table
CREATE TABLE IF NOT EXISTS match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    game_mode VARCHAR(50) DEFAULT 'single' CHECK (game_mode IN ('single', 'multiplayer', 'quiz')),
    duration INTEGER NOT NULL DEFAULT 0, -- in seconds
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_score ON match_history(score DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_completed_at ON match_history(completed_at DESC);

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

