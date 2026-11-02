import { NextResponse } from 'next/server';
import { supabase, isDevMode } from '@/lib/supabase';
import { getDevLobbies } from '../create/route';

export const dynamic = 'force-dynamic';

// Cleanup old lobbies to free up codes
export async function POST() {
  try {
    // Development mode
    if (isDevMode) {
      const devLobbies = getDevLobbies();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const twoHours = 2 * 60 * 60 * 1000;
      
      let deletedCount = 0;
      for (const [code, lobby] of devLobbies.entries()) {
        const updatedAt = new Date(lobby.updated_at).getTime();
        const age = now - updatedAt;
        
        // Delete completed/cancelled lobbies older than 1 hour
        if ((lobby.status === 'completed' || lobby.status === 'cancelled') && age > oneHour) {
          devLobbies.delete(code);
          deletedCount++;
        }
        
        // Delete waiting/ready lobbies older than 2 hours (abandoned)
        if ((lobby.status === 'waiting' || lobby.status === 'ready') && age > twoHours) {
          devLobbies.delete(code);
          deletedCount++;
        }
      }
      
      return NextResponse.json({ 
        message: `Cleaned up ${deletedCount} old lobbies (dev mode)`,
        deletedCount 
      });
    }

    // Production mode with Supabase - call the cleanup function
    const { error } = await supabase.rpc('cleanup_old_lobbies');
    
    if (error) {
      console.error('Error cleaning up lobbies:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup lobbies' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Successfully cleaned up old lobbies'
    });
  } catch (error) {
    console.error('Error in cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

