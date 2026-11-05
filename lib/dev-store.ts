// In-memory data for dev mode (no Supabase configured). Next.js bundles each
// route separately, so the store lives on globalThis for routes to share it.
import type { DbQuestion } from '@/types/game'
import type { DevUser } from './dev-users'
import type { Attempt } from './learning'
import type { Lobby } from './lobbies'
import type { MatchRecord, PlayerStats } from './match-results'

interface DevStore {
  users: Map<string, DevUser>
  lobbies: Map<string, Lobby>
  questions: Map<string, DbQuestion & { is_active: boolean }>
  stats: Map<string, PlayerStats>
  matchHistory: Map<string, MatchRecord[]>
  rateLimits: Map<string, { attempts: number; resetAt: number }>
  attempts: Attempt[]
  passwordResets: Map<string, { user_id: string; expires_at: string }>
}

const globalStore = globalThis as typeof globalThis & { __devStore?: DevStore }

export const devStore: DevStore = (globalStore.__devStore ??= {
  users: new Map(),
  lobbies: new Map(),
  questions: new Map(),
  stats: new Map(),
  matchHistory: new Map(),
  rateLimits: new Map(),
  attempts: [],
  passwordResets: new Map(),
})
