'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { AuthLayout, FormError, PasswordInput } from '@/components/auth-layout'
import { useAuth } from '@/components/auth-provider'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_PASSWORD_LENGTH = 6

export default function RegisterPage() {
  const { t, translateError } = useI18n()
  const { register, loginAsGuest } = useAuth()
  const redirectTo = useSearchParams().get('redirect') || undefined
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.passwordShort'))
      return
    }

    setLoading(true)

    try {
      await register(email, password, name, redirectTo)
      toast.success(t('auth.registerSuccess', { name }))
    } catch (err) {
      setError((err instanceof Error && translateError(err.message)) || t('auth.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    toast.info(t('auth.guestToast'), { description: t('auth.guestToastBody') })
    await loginAsGuest(redirectTo)
  }

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('auth.name')}</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder={t('auth.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={loading}
          />
        </div>
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
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder={t('auth.newPasswordPlaceholder')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {t(loading ? 'auth.creating' : 'common.register')}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 whitespace-normal h-auto min-h-9"
          onClick={handleGuestLogin}
          disabled={loading}
        >
          <Users className="h-4 w-4 shrink-0" />
          {t('auth.guest')}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          {t('auth.hasAccount')}{' '}
          <Link
            href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
            className="text-primary hover:underline"
          >
            {t('common.login')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
