-- Add host_name and guest_name columns to game_lobbies table
-- Run this in your Supabase SQL editor

ALTER TABLE game_lobbies 
ADD COLUMN IF NOT EXISTS host_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);

-- Optionally, backfill existing lobbies with names from the users table
UPDATE game_lobbies gl
SET host_name = u.name
FROM users u
WHERE gl.host_user_id = u.id
AND gl.host_name IS NULL;

UPDATE game_lobbies gl
SET guest_name = u.name
FROM users u
WHERE gl.guest_user_id = u.id
AND gl.guest_name IS NULL;

