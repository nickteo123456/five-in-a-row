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

export default function LoginPage() {
  const { t, translateError } = useI18n()
  const { login, loginAsGuest } = useAuth()
  const redirectTo = useSearchParams().get('redirect') || undefined
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, redirectTo)
      toast.success(t('auth.loginSuccess'))
    } catch (err) {
      setError((err instanceof Error && translateError(err.message)) || t('auth.loginFailed'))
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
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t('auth.forgot')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {t(loading ? 'auth.loggingIn' : 'common.login')}
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex-1 border-t border-muted-foreground/20" />
          {t('auth.or')}
          <span className="flex-1 border-t border-muted-foreground/20" />
        </div>

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
          {t('auth.noAccount')}{' '}
          <Link
            href={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
            className="text-primary hover:underline"
          >
            {t('common.register')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
