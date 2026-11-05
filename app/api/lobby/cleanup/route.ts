import { NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { devStore } from '@/lib/dev-store'
import { requireRole } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Cleanup old lobbies to free up codes
export async function POST() {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    // Development mode
    if (isDevMode) {
      const devLobbies = devStore.lobbies
      const now = Date.now()
      const oneHour = 60 * 60 * 1000
      const twoHours = 2 * 60 * 60 * 1000

      let deletedCount = 0
      for (const [code, lobby] of devLobbies.entries()) {
        const updatedAt = new Date(lobby.updated_at).getTime()
        const age = now - updatedAt

        // Delete completed/cancelled lobbies older than 1 hour
        if ((lobby.status === 'completed' || lobby.status === 'cancelled') && age > oneHour) {
          devLobbies.delete(code)
          deletedCount++
        }

        // Delete waiting/ready lobbies older than 2 hours (abandoned)
        if ((lobby.status === 'waiting' || lobby.status === 'ready') && age > twoHours) {
          devLobbies.delete(code)
          deletedCount++
        }
      }

      return NextResponse.json({
        message: `Cleaned up ${deletedCount} old lobbies (dev mode)`,
        deletedCount,
      })
    }

    // Production mode with Supabase - call the cleanup function
    const { error } = await supabaseAdmin.rpc('cleanup_old_lobbies')

    if (error) {
      logger.error('Error cleaning up lobbies:', error)
      return NextResponse.json({ error: 'Failed to cleanup lobbies' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully cleaned up old lobbies',
    })
  } catch (error) {
    logger.error('Error in cleanup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
