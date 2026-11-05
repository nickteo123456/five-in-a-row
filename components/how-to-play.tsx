'use client'

import { useState } from 'react'
import { CircleHelp, Grid3x3, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from './i18n-provider'

const STEPS = [
  { icon: CircleHelp, title: 'tutorial.step1Title', body: 'tutorial.step1' },
  { icon: Grid3x3, title: 'tutorial.step2Title', body: 'tutorial.step2' },
  { icon: Trophy, title: 'tutorial.step3Title', body: 'tutorial.step3' },
] as const

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md cyber-border glow-primary">
        <DialogHeader>
          <DialogTitle className="text-primary">{t('tutorial.title')}</DialogTitle>
          <DialogDescription>
            {stepIndex + 1} / {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
            <step.icon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold">{t(step.title)}</h3>
          <p className="text-muted-foreground">{t(step.body)}</p>
        </div>

        <Button
          onClick={() => (isLastStep ? onClose() : setStepIndex(stepIndex + 1))}
          className="w-full"
        >
          {t(isLastStep ? 'tutorial.start' : 'tutorial.next')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
