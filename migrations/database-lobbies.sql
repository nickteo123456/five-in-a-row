-- Game Lobbies Table for Online Multiplayer
CREATE TABLE IF NOT EXISTS game_lobbies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lobby_code VARCHAR(5) UNIQUE NOT NULL,
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_name VARCHAR(255),
    guest_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'active', 'completed', 'cancelled')),
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_lobbies_code ON game_lobbies(lobby_code);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_host ON game_lobbies(host_user_id);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_guest ON game_lobbies(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_status ON game_lobbies(status);

-- Function to generate random 5-digit code
CREATE OR REPLACE FUNCTION generate_lobby_code()
RETURNS VARCHAR(5) AS $$
DECLARE
    new_code VARCHAR(5);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 5-digit code (10000-99999)
        new_code := LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM game_lobbies WHERE lobby_code = new_code AND status IN ('waiting', 'ready', 'active')) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lobby_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lobby_timestamp
    BEFORE UPDATE ON game_lobbies
    FOR EACH ROW
    EXECUTE FUNCTION update_lobby_timestamp();

-- Function to clean up old lobbies
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

-- Automatically cleanup on every new lobby creation
CREATE OR REPLACE FUNCTION auto_cleanup_on_create()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_old_lobbies();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_cleanup
    BEFORE INSERT ON game_lobbies
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_cleanup_on_create();

