// Short synthesized effects, so the app needs no audio files.
const SOUND_SETTING_KEY = 'soundEnabled'

export type SoundName = 'correct' | 'wrong' | 'place' | 'turn' | 'win' | 'lose'

const NOTES: Record<SoundName, [frequency: number, seconds: number][]> = {
  correct: [
    [660, 0.08],
    [880, 0.12],
  ],
  wrong: [
    [220, 0.12],
    [165, 0.18],
  ],
  place: [[440, 0.06]],
  turn: [
    [523, 0.08],
    [523, 0.08],
  ],
  win: [
    [523, 0.1],
    [659, 0.1],
    [784, 0.1],
    [1047, 0.22],
  ],
  lose: [
    [392, 0.14],
    [330, 0.14],
    [262, 0.24],
  ],
}

const VIBRATIONS: Partial<Record<SoundName, number | number[]>> = {
  wrong: 120,
  win: [60, 40, 60, 40, 120],
  turn: 40,
}

let audioContext: AudioContext | null = null

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_SETTING_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_SETTING_KEY, String(enabled))
  } catch {
    // The setting just won't be remembered
  }
}

export function playSound(name: SoundName) {
  if (typeof window === 'undefined' || !isSoundEnabled()) return

  try {
    audioContext ??= new AudioContext()
    let startTime = audioContext.currentTime

    for (const [frequency, seconds] of NOTES[name]) {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.type = 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.08, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + seconds)
      oscillator.connect(gain).connect(audioContext.destination)
      oscillator.start(startTime)
      oscillator.stop(startTime + seconds)
      startTime += seconds
    }

    const vibration = VIBRATIONS[name]
    if (vibration) navigator.vibrate?.(vibration)
  } catch {
    // Audio is optional: browsers can block it until the first interaction
  }
}
