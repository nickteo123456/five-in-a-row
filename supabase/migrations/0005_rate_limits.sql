-- Attempt counters for login and registration. Serverless instances don't share
-- memory, so the counts live in the database.
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Counts one attempt and returns whether it is within the limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_attempts INTEGER;
BEGIN
    DELETE FROM rate_limits WHERE reset_at < NOW();

    INSERT INTO rate_limits (key, attempts, reset_at)
    VALUES (p_key, 1, NOW() + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE SET attempts = rate_limits.attempts + 1
    RETURNING attempts INTO current_attempts;

    RETURN current_attempts <= p_limit;
END;
$$ LANGUAGE plpgsql;

