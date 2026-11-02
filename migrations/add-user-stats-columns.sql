-- Add stats columns to users table for tracking player performance
-- Run this migration to add the new stats tracking fields

-- Add columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_highest_score ON users(highest_score DESC);

-- Comment the columns
COMMENT ON COLUMN users.total_score IS 'Cumulative score across all matches';
COMMENT ON COLUMN users.highest_score IS 'Highest score achieved in a single match';
COMMENT ON COLUMN users.matches_played IS 'Total number of matches completed';
COMMENT ON COLUMN users.wins IS 'Total number of matches won';
COMMENT ON COLUMN users.losses IS 'Total number of matches lost';

