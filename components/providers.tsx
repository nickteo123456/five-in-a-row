'use client'

import { AuthProvider } from './auth-provider'
import { GameProvider } from './game-provider'
import { I18nProvider } from './i18n-provider'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <GameProvider>{children}</GameProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
