'use client'

import Link from 'next/link'
import { LogoMark } from '@/components/brand'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const { t } = useI18n()

  return (
    <div className="min-h-dvh cyber-grid flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <LogoMark className="h-16 w-16 mx-auto" />
        <h1 className="text-2xl font-bold">{t('error.notFoundTitle')}</h1>
        <p className="text-muted-foreground">{t('error.notFoundBody')}</p>
        <Button asChild>
          <Link href="/">{t('error.home')}</Link>
        </Button>
      </div>
    </div>
  )
}
