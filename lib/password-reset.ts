import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin, isDevMode } from './supabase'
import { devStore } from './dev-store'
import { findDevUserById } from './dev-users'

const TOKEN_LIFETIME_MS = 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Only the hash is stored, so a database leak doesn't expose usable reset links.
export async function createResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const reset = {
    token_hash: hashToken(token),
    user_id: userId,
    expires_at: new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString(),
  }

  if (isDevMode) {
    devStore.passwordResets.set(reset.token_hash, reset)
    return token
  }

  const { error } = await supabaseAdmin.from('password_resets').insert(reset)
  if (error) throw error

  return token
}

// Uses up the token and sets the new password. Returns false if the token is
// unknown, expired or already used.
export async function resetPassword(token: string, passwordHash: string): Promise<boolean> {
  const tokenHash = hashToken(token)
  const now = new Date().toISOString()

  if (isDevMode) {
    const reset = devStore.passwordResets.get(tokenHash)
    const user = reset && findDevUserById(reset.user_id)
    devStore.passwordResets.delete(tokenHash)

    if (!reset || !user || reset.expires_at < now) return false

    user.password_hash = passwordHash
    return true
  }

  const { data: reset, error } = await supabaseAdmin
    .from('password_resets')
    .delete()
    .eq('token_hash', tokenHash)
    .gt('expires_at', now)
    .select('user_id')
    .maybeSingle()

  if (error) throw error
  if (!reset) return false

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ password_hash: passwordHash, updated_at: now })
    .eq('id', reset.user_id)

  if (updateError) throw updateError

  return true
}
