'use client'

import { useI18n } from './i18n-provider'

export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#04131a" />
      <path d="M12 52 52 12" stroke="#0b3b45" strokeWidth="2" />
      {[12, 22, 32, 42, 52].map((position, index) => (
        <circle
          key={position}
          cx={position}
          cy={64 - position}
          r="6"
          fill={index === 2 ? '#22e38b' : '#19c8dc'}
        />
      ))}
    </svg>
  )
}

export function Brand({ size = 'large' }: { size?: 'large' | 'small' }) {
  const { t } = useI18n()
  const isLarge = size === 'large'

  return (
    <div className="flex items-center justify-center gap-3 min-w-0">
      <LogoMark className={`${isLarge ? 'h-12 w-12' : 'h-9 w-9'} shrink-0`} />
      <h1
        className={`font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent text-balance ${
          isLarge ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-2xl'
        }`}
      >
        {t('app.name')}
      </h1>
    </div>
  )
}
