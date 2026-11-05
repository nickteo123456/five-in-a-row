import { supabaseAdmin, isDevMode } from './supabase'
import { findDevUserByEmail, findDevUserById, createDevUser } from './dev-users'
import { logger } from './logger'

export interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  updated_at: string
}

export interface UserWithPassword extends User {
  password_hash: string
}

const PUBLIC_USER_COLUMNS = 'id, email, name, role, created_at, updated_at'

function toPublicUser({ id, email, name, role, created_at, updated_at }: User): User {
  return { id, email, name, role, created_at, updated_at }
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<User | null> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    return toPublicUser(createDevUser(email, name, passwordHash))
  }

  try {
    // Registration only ever creates students. The teacher account comes from
    // `npm run create-teacher`.
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email,
          name,
          password_hash: passwordHash,
          role: 'student',
        },
      ])
      .select(PUBLIC_USER_COLUMNS)
      .single()

    if (error) {
      // If table doesn't exist, return null instead of error
      if (error.code === '42P01') {
        // Table doesn't exist
        return null
      }
      logger.error('Error creating user:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Database error:', error)
    return null
  }
}

// Includes the password hash, so the result must never be sent to a client.
export async function findUserWithPasswordByEmail(email: string): Promise<UserWithPassword | null> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    return findDevUserByEmail(email)
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`${PUBLIC_USER_COLUMNS}, password_hash`)
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      // If table doesn't exist, return null instead of error
      if (error.code === '42P01') {
        // Table doesn't exist
        return null
      }
      logger.error('Error finding user:', error)
      return null
    }

    return data || null
  } catch (error) {
    logger.error('Database error:', error)
    return null
  }
}

export async function findUserById(id: string): Promise<User | null> {
  // Use in-memory dev users if Supabase is not configured
  if (isDevMode) {
    const user = findDevUserById(id)
    return user ? toPublicUser(user) : null
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(PUBLIC_USER_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Error finding user:', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Database error:', error)
    return null
  }
}
