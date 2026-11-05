-- Lock the database down to the server. The app reaches Supabase only through
-- route handlers using the service role key, which bypasses RLS. With RLS on and
-- no policies, the public anon key can't read or write anything.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Older policies relied on Supabase Auth, which the app no longer uses
DROP POLICY IF EXISTS "Users can view own match history" ON match_history;
DROP POLICY IF EXISTS "Users can insert own match history" ON match_history;
DROP POLICY IF EXISTS "Teachers can view all match history" ON match_history;

REVOKE ALL ON users, questions, game_lobbies, match_history, rate_limits, question_attempts, password_resets
FROM anon, authenticated;
GRANT ALL ON users, questions, game_lobbies, match_history, rate_limits, question_attempts, password_resets
TO service_role;

REVOKE EXECUTE ON FUNCTION generate_lobby_code(), cleanup_old_lobbies(), check_rate_limit(TEXT, INTEGER, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_lobby_code(), cleanup_old_lobbies(), check_rate_limit(TEXT, INTEGER, INTEGER)
TO service_role;
