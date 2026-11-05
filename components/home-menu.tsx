'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  CircleHelp,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Monitor,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from './auth-provider'
import { Brand } from './brand'
import { GameSetupDialog, type LocalGameKind } from './game-setup-dialog'
import { HowToPlay } from './how-to-play'
import { useI18n } from './i18n-provider'
import { LobbyDialog } from './lobby-dialog'
import { LanguageToggle, SoundToggle } from './settings-controls'

const TUTORIAL_SEEN_KEY = 'tutorialSeen'

// Fixed positions, so the page renders the same on the server and the client
const FLOATING_SYMBOLS = [8, 24, 41, 57, 73, 90].map((left, index) => ({
  left,
  size: 80 + ((index * 37) % 80),
  duration: 16 + ((index * 5) % 14),
  delay: index * 1.5,
  animation: `floatRandom${(index % 4) + 1}`,
}))

function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true'
  } catch {
    return true
  }
}

function ModeButton({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: LucideIcon
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 w-full text-left p-4 rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm transition hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

export function HomeMenu({ onCreatingLobby }: { onCreatingLobby: (isCreating: boolean) => void }) {
  const { t } = useI18n()
  const { user, isGuest, logout } = useAuth()
  const router = useRouter()
  const [localGame, setLocalGame] = useState<LocalGameKind | null>(null)
  const [showLobbyDialog, setShowLobbyDialog] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !hasSeenTutorial())

  useEffect(() => {
    if (!showTutorial) {
      try {
        localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
      } catch {
        // The tutorial may just show again next time
      }
    }
  }, [showTutorial])

  const dashboardPath = user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'

  return (
    <div className="min-h-dvh cyber-grid">
      <div className="floating-xo-bg" aria-hidden="true">
        {FLOATING_SYMBOLS.map(({ left, size, duration, delay, animation }, index) => (
          <div
            key={left}
            className={`floating-symbol ${index % 2 === 0 ? 'x' : 'o'}`}
            style={{
              left: `${left}%`,
              fontSize: `${size}px`,
              animation: `${animation} ${duration}s linear infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            {index % 2 === 0 ? 'X' : 'O'}
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-xl px-4 py-4 sm:py-6">
        <nav className="flex flex-wrap items-center justify-end gap-2 mb-8">
          <LanguageToggle />
          <SoundToggle />
          {isGuest ? (
            <Button size="sm" onClick={() => router.push('/login')} className="gap-1.5">
              <LogIn className="h-4 w-4" />
              {t('common.login')}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(dashboardPath)}
                className="gap-1.5 bg-background/60"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t(user?.role === 'teacher' ? 'home.teacherDashboard' : 'home.myDashboard')}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={logout}
                aria-label={t('common.logout')}
                className="h-8 w-8 bg-background/60"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </nav>

        <header className="text-center mb-8">
          <Brand />
          <p className="mt-3 text-muted-foreground">{t('app.description')}</p>
        </header>

        <h2 className="sr-only">{t('home.pickMode')}</h2>
        <div className="space-y-3">
          <ModeButton
            icon={Bot}
            title={t('home.computer')}
            hint={t('home.computerHint')}
            onClick={() => setLocalGame('computer')}
          />
          <ModeButton
            icon={Monitor}
            title={t('home.screen')}
            hint={t('home.screenHint')}
            onClick={() => setLocalGame('screen')}
          />
          <ModeButton
            icon={Users}
            title={t('home.realBoard')}
            hint={t('home.realBoardHint')}
            onClick={() => setLocalGame('realBoard')}
          />
          <ModeButton
            icon={Globe}
            title={t('home.online')}
            hint={t(isGuest ? 'home.onlineGuest' : 'home.onlineHint')}
            onClick={() => (isGuest ? router.push('/login') : setShowLobbyDialog(true))}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="ghost" onClick={() => setShowTutorial(true)} className="gap-1.5">
            <CircleHelp className="h-4 w-4" />
            {t('home.howToPlay')}
          </Button>
          {!isGuest && (
            <Button variant="ghost" onClick={() => router.push('/leaderboard')} className="gap-1.5">
              <Trophy className="h-4 w-4" />
              {t('home.leaderboard')}
            </Button>
          )}
        </div>
      </div>

      {localGame && <GameSetupDialog kind={localGame} onClose={() => setLocalGame(null)} />}
      {showLobbyDialog && (
        <LobbyDialog onClose={() => setShowLobbyDialog(false)} onCreatingLobby={onCreatingLobby} />
      )}
      {showTutorial && <HowToPlay onClose={() => setShowTutorial(false)} />}
    </div>
  )
}
