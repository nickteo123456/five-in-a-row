'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGame } from './game-provider'
import { useI18n } from './i18n-provider'

interface LobbyDialogProps {
  onClose: () => void
  onCreatingLobby: (isCreating: boolean) => void
}

export function LobbyDialog({ onClose, onCreatingLobby }: LobbyDialogProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { createLobby } = useGame()
  const [isJoining, setIsJoining] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleCreateLobby = async () => {
    onClose()
    onCreatingLobby(true)

    const lobby = await createLobby()
    onCreatingLobby(false)

    if (lobby) router.replace(`/lobby/${lobby.lobbyCode}`)
  }

  const handleJoinLobby = async (event: React.FormEvent) => {
    event.preventDefault()
    const code = joinCode.trim()
    if (!code) return

    setIsChecking(true)

    try {
      // Check the code first, so a typo keeps the dialog open
      const response = await fetch(`/api/lobby/${code}`)

      if (!response.ok) {
        toast.error(t('lobby.notFound'))
        return
      }

      const { lobby } = await response.json()

      if (lobby.guest_user_id || lobby.status !== 'waiting') {
        toast.error(t('lobby.full'))
        return
      }

      onClose()
      router.push(`/lobby/${code}`)
    } catch {
      toast.error(t('lobby.joinFailed'))
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md cyber-border glow-primary">
        <DialogHeader>
          <DialogTitle className="text-primary">{t('lobby.title')}</DialogTitle>
          <DialogDescription>{t('lobby.subtitle')}</DialogDescription>
        </DialogHeader>

        {isJoining ? (
          <form onSubmit={handleJoinLobby} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lobbyCode">{t('lobby.code')}</Label>
              <Input
                id="lobbyCode"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                autoFocus
                placeholder={t('lobby.codePlaceholder')}
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, ''))}
                className="font-mono text-lg text-center tracking-widest"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsJoining(false)}>
                {t('common.back')}
              </Button>
              <Button type="submit" disabled={joinCode.length !== 5 || isChecking}>
                {t(isChecking ? 'lobby.joining' : 'lobby.joinButton')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleCreateLobby}
              className="w-full h-auto py-3 justify-start gap-3 whitespace-normal text-left"
            >
              <Plus className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-bold">{t('lobby.create')}</span>
                <span className="block text-xs font-normal">{t('lobby.createHint')}</span>
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsJoining(true)}
              className="w-full h-auto py-3 justify-start gap-3 whitespace-normal text-left"
            >
              <UserPlus className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-bold">{t('lobby.join')}</span>
                <span className="block text-xs font-normal">{t('lobby.joinHint')}</span>
              </span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
