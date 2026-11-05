'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { AuthLayout, FormError } from '@/components/auth-layout'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const { t, translateError } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setIsSent(true)
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
    <AuthLayout title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      {isSent ? (
        <p role="status" className="p-3 rounded-md bg-accent/10 text-accent text-sm">
          {t('auth.forgotSent')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError message={error} />
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {t('auth.forgotSend')}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm text-center">
        <Link href="/login" className="text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
