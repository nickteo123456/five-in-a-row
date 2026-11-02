Run this SQL in your Supabase SQL Editor:

-- Create users table in Supabase
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the teacher account (password: 20040925nick)
INSERT INTO users (email, name, password_hash, role) VALUES (
    'iamnick0925@gmail.com',
    'Nick',
    '$2b$10$z9o93vItn7bbhsvfoorEIORf3wsJMrB0v.mv2qUTsjPIi8G2HGZ9W',
    'teacher'
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();
