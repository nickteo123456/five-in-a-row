'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Brand } from './brand'
import { useI18n } from './i18n-provider'
import { LanguageToggle } from './settings-controls'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const { t } = useI18n()

  return (
    <div className="min-h-dvh cyber-grid flex flex-col items-center justify-center gap-6 p-4">
      <div className="w-full max-w-md flex justify-end">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md text-center space-y-2">
        <Brand />
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </div>
      <Card className="w-full max-w-md cyber-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

export function PasswordInput(props: ComponentProps<typeof Input>) {
  const { t } = useI18n()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={isVisible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        aria-label={t(isVisible ? 'auth.hidePassword' : 'auth.showPassword')}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null

  return (
    <p role="alert" className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
      {message}
    </p>
  )
}
