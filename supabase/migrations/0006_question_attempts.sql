-- Every answer a logged-in player gives. Powers topic progress, the review list
-- and class insights.
CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_attempts_user ON question_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_attempts_created ON question_attempts(created_at DESC);
