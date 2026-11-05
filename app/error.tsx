'use client'

import { useEffect } from 'react'
import { LogoMark } from '@/components/brand'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    logger.error(error)
  }, [error])

  return (
    <div className="min-h-dvh cyber-grid flex items-center justify-center p-4">
      <div role="alert" className="text-center space-y-3">
        <LogoMark className="h-16 w-16 mx-auto" />
        <h1 className="text-2xl font-bold">{t('error.title')}</h1>
        <p className="text-muted-foreground">{t('error.body')}</p>
        <Button onClick={reset}>{t('common.retry')}</Button>
      </div>
    </div>
  )
}
