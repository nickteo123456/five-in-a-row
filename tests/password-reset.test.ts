import { describe, expect, it } from 'vitest'
import { createDevUser } from '@/lib/dev-users'
import { devStore } from '@/lib/dev-store'
import { createResetToken, resetPassword } from '@/lib/password-reset'

describe('password reset', () => {
  const newUser = () => createDevUser(`${crypto.randomUUID()}@example.com`, 'User', 'old-hash')

  it('sets the new password', async () => {
    const user = newUser()

    expect(await resetPassword(await createResetToken(user.id), 'new-hash')).toBe(true)
    expect(user.password_hash).toBe('new-hash')
  })

  it('only works once', async () => {
    const token = await createResetToken(newUser().id)

    await resetPassword(token, 'new-hash')

    expect(await resetPassword(token, 'other-hash')).toBe(false)
  })

  it('rejects an unknown token', async () => {
    expect(await resetPassword('unknown', 'new-hash')).toBe(false)
  })

  it('rejects an expired token', async () => {
    const user = newUser()
    const token = await createResetToken(user.id)

    for (const reset of devStore.passwordResets.values()) {
      reset.expires_at = '2000-01-01T00:00:00.000Z'
    }

    expect(await resetPassword(token, 'new-hash')).toBe(false)
    expect(user.password_hash).toBe('old-hash')
  })

  it('stores only a hash of the token', async () => {
    const token = await createResetToken(newUser().id)
    expect(devStore.passwordResets.has(token)).toBe(false)
  })
})
