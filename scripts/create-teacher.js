// Creates (or updates) the teacher account in Supabase.
// Usage: npm run create-teacher   (reads .env.local)
const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const MIN_PASSWORD_LENGTH = 12

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`❌ Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

async function createTeacherAccount() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const email = requireEnv('TEACHER_EMAIL').trim().toLowerCase()
  const password = requireEnv('TEACHER_PASSWORD')
  const name = process.env.TEACHER_NAME || 'Teacher'

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`❌ TEACHER_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long`)
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🔐 Creating teacher account...')
  const passwordHash = await bcrypt.hash(password, 10)

  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        email,
        name,
        password_hash: passwordHash,
        role: 'teacher',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
    .select('id, email, name, role')
    .single()

  if (error) {
    console.error('❌ Error creating teacher account:', error)
    process.exit(1)
  }

  console.log('✅ Teacher account is ready')
  console.log('📧 Email:', user.email)
  console.log('👤 Name:', user.name)
  console.log('🎭 Role:', user.role)
}

createTeacherAccount().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
