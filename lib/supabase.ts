import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-key-for-development'

// Server-only client. It bypasses RLS, so authorization is enforced in the
// route handlers. Never import this module from client components.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export const isDevMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://localhost:54321'

export type User = {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  updated_at: string
}
