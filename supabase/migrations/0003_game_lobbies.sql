-- Online games. One row per lobby, polled by both players.
CREATE TABLE IF NOT EXISTS game_lobbies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lobby_code VARCHAR(5) UNIQUE NOT NULL,
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guest_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    current_turn VARCHAR(1) CHECK (current_turn IN ('X', 'O')),
    board_state JSONB DEFAULT '[[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]]'::JSONB,
    host_score INTEGER DEFAULT 0,
    guest_score INTEGER DEFAULT 0,
    current_question_index INTEGER DEFAULT 0,
    host_can_place BOOLEAN DEFAULT false,
    guest_can_place BOOLEAN DEFAULT false,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE game_lobbies
ADD COLUMN IF NOT EXISTS host_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS play_again_request UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS play_again_requester_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS play_again_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS play_again_rejected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS play_again_rejecter_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS host_answered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS host_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS guest_answered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS guest_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS host_last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS guest_last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE game_lobbies DROP CONSTRAINT IF EXISTS game_lobbies_status_check;
ALTER TABLE game_lobbies
ADD CONSTRAINT game_lobbies_status_check
CHECK (status IN ('waiting', 'ready', 'active', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_game_lobbies_code ON game_lobbies(lobby_code);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_host ON game_lobbies(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_guest ON game_lobbies(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_status ON game_lobbies(status);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_play_again ON game_lobbies(play_again_request);

-- Picks a random 5-digit code that no open lobby is using
CREATE OR REPLACE FUNCTION generate_lobby_code()
RETURNS VARCHAR(5) AS $$
DECLARE
    new_code VARCHAR(5);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');

        SELECT EXISTS(
            SELECT 1 FROM game_lobbies
            WHERE lobby_code = new_code AND status IN ('waiting', 'ready', 'active')
        ) INTO code_exists;

        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_lobby_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lobby_timestamp ON game_lobbies;
CREATE TRIGGER trigger_update_lobby_timestamp
    BEFORE UPDATE ON game_lobbies
    FOR EACH ROW
    EXECUTE FUNCTION update_lobby_timestamp();

-- Removes finished lobbies after 1 hour and abandoned ones after 2
CREATE OR REPLACE FUNCTION cleanup_old_lobbies()
RETURNS void AS $$
BEGIN
    DELETE FROM game_lobbies
    WHERE updated_at < NOW() - INTERVAL '1 hour'
    AND status IN ('completed', 'cancelled');

    DELETE FROM game_lobbies
    WHERE updated_at < NOW() - INTERVAL '2 hours'
    AND status IN ('waiting', 'ready');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_cleanup_on_create()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_old_lobbies();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_cleanup ON game_lobbies;
CREATE TRIGGER trigger_auto_cleanup
    BEFORE INSERT ON game_lobbies
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_cleanup_on_create();
