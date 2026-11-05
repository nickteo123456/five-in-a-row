'use client'

import { useState } from 'react'
import { Languages, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound'
import { useI18n } from './i18n-provider'

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      aria-label={t('common.language')}
      className="gap-1.5 bg-background/60"
    >
      <Languages className="h-4 w-4" />
      {locale === 'zh' ? 'EN' : '中文'}
    </Button>
  )
}

export function SoundToggle() {
  const { t } = useI18n()
  const [isOn, setIsOn] = useState(isSoundEnabled)

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => {
        setSoundEnabled(!isOn)
        setIsOn(!isOn)
      }}
      aria-label={t(isOn ? 'common.soundOn' : 'common.soundOff')}
      className="h-8 w-8 bg-background/60"
    >
      {isOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </Button>
  )
}
