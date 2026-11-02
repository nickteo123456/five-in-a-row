-- Update existing game_lobbies table to add cleanup functionality
-- Run this in Supabase SQL Editor
-- This is safe to run multiple times

-- 0. Update status constraint to include 'ready' status
ALTER TABLE game_lobbies 
DROP CONSTRAINT IF EXISTS game_lobbies_status_check;

ALTER TABLE game_lobbies 
ADD CONSTRAINT game_lobbies_status_check 
CHECK (status IN ('waiting', 'ready', 'active', 'completed', 'cancelled'));

-- 1. Function to clean up old lobbies
CREATE OR REPLACE FUNCTION cleanup_old_lobbies()
RETURNS void AS $$
BEGIN
    -- Delete completed/cancelled lobbies older than 1 hour
    DELETE FROM game_lobbies
    WHERE updated_at < NOW() - INTERVAL '1 hour'
    AND status IN ('completed', 'cancelled');
    
    -- Delete waiting/ready lobbies older than 2 hours (abandoned lobbies)
    DELETE FROM game_lobbies
    WHERE updated_at < NOW() - INTERVAL '2 hours'
    AND status IN ('waiting', 'ready');
END;
$$ LANGUAGE plpgsql;

-- 2. Automatically cleanup on every new lobby creation
CREATE OR REPLACE FUNCTION auto_cleanup_on_create()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_old_lobbies();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS trigger_auto_cleanup ON game_lobbies;

CREATE TRIGGER trigger_auto_cleanup
    BEFORE INSERT ON game_lobbies
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_cleanup_on_create();

-- 4. Optional: Run cleanup now to remove any old lobbies
SELECT cleanup_old_lobbies();

