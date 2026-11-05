'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => logger.error(error))
    }
  }, [])

  return null
}
