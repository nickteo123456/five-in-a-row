import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isDevMode } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// In-memory stats for dev mode
const devStats = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { userId, score, isWin, matchData } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Development mode
    if (isDevMode) {
      const currentStats = devStats.get(userId) || {
        total_score: 0,
        highest_score: 0,
        matches_played: 0,
        wins: 0,
        losses: 0,
      };

      const newStats = {
        total_score: currentStats.total_score + score,
        highest_score: Math.max(currentStats.highest_score, score),
        matches_played: currentStats.matches_played + 1,
        wins: currentStats.wins + (isWin ? 1 : 0),
        losses: currentStats.losses + (isWin ? 0 : 1),
      };

      devStats.set(userId, newStats);

      return NextResponse.json({ 
        stats: newStats,
        message: 'Stats updated successfully (dev mode)' 
      });
    }

    // Production mode with Supabase
    // First, get current stats using admin client
    const { data: currentStats } = await supabaseAdmin
      .from('users')
      .select('total_score, highest_score, matches_played, wins, losses')
      .eq('id', userId)
      .single();

    const newStats = {
      total_score: (currentStats?.total_score || 0) + score,
      highest_score: Math.max(currentStats?.highest_score || 0, score),
      matches_played: (currentStats?.matches_played || 0) + 1,
      wins: (currentStats?.wins || 0) + (isWin ? 1 : 0),
      losses: (currentStats?.losses || 0) + (isWin ? 0 : 1),
    };

    // Update user stats using admin client
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(newStats)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user stats:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      stats: newStats,
      message: 'Stats updated successfully' 
    });
  } catch (error) {
    console.error('Error in update stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export devStats for other routes to access
export function getDevStats() {
  return devStats;
}

