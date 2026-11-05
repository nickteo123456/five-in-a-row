-- One row per player per finished online game
CREATE TABLE IF NOT EXISTS match_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    game_mode VARCHAR(50) DEFAULT 'online',
    duration INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE match_history
ADD COLUMN IF NOT EXISTS opponent_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS opponent_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;

-- An older version of this table rejected 'online'
ALTER TABLE match_history DROP CONSTRAINT IF EXISTS match_history_game_mode_check;

CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_user_winner ON match_history(user_id, is_winner);
CREATE INDEX IF NOT EXISTS idx_match_history_completed ON match_history(completed_at DESC);
