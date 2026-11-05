'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AuthLayout, FormError, PasswordInput } from '@/components/auth-layout'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const { t, translateError } = useI18n()
  const token = useSearchParams().get('token')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (response.ok) {
        setIsDone(true)
      } else {
        const data = await response.json()
        setError(translateError(data.error) || t('error.body'))
      }
    } catch {
      setError(t('error.body'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t('auth.resetTitle')} subtitle={t('auth.newPasswordPlaceholder')}>
      {isDone ? (
        <p role="status" className="p-3 rounded-md bg-accent/10 text-accent text-sm">
          {t('auth.resetDone')}
        </p>
      ) : token ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError message={error} />
          <div className="space-y-1.5">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder={t('auth.newPasswordPlaceholder')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {t('auth.resetSave')}
          </Button>
        </form>
      ) : (
        <FormError message={t('auth.resetMissing')} />
      )}
      <p className="mt-4 text-sm text-center">
        <Link href="/login" className="text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
