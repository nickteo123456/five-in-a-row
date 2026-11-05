'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { en, serverErrors, zh, type MessageKey } from '@/lib/i18n/messages'

export type Locale = 'en' | 'zh'

const LOCALE_KEY = 'locale'
const LOCALE_EVENT = 'localechange'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  translateError: (message?: string) => string | undefined
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    // Fall back to the browser language below
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function subscribe(onChange: () => void) {
  window.addEventListener(LOCALE_EVENT, onChange)
  return () => window.removeEventListener(LOCALE_EVENT, onChange)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribe, readLocale, () => 'en')

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, nextLocale)
    } catch {
      // The choice just won't be remembered
    }
    window.dispatchEvent(new Event(LOCALE_EVENT))
  }, [])

  const value = useMemo<I18nContextType>(() => {
    const messages = locale === 'zh' ? zh : en

    return {
      locale,
      setLocale,
      t: (key, params) =>
        Object.entries(params ?? {}).reduce(
          (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
          messages[key]
        ),
      translateError: (message) =>
        locale === 'zh' && message ? serverErrors[message] || message : message,
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
