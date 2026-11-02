-- Add play again request fields to game_lobbies table
ALTER TABLE game_lobbies
ADD COLUMN IF NOT EXISTS play_again_request UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS play_again_requester_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS play_again_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS play_again_rejected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS play_again_rejecter_name VARCHAR(255);

-- Add index for play again request
CREATE INDEX IF NOT EXISTS idx_game_lobbies_play_again ON game_lobbies(play_again_request);

