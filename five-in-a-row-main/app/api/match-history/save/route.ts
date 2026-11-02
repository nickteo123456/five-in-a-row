import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isDevMode } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// In-memory match history for dev mode
const devMatchHistory = new Map<string, any[]>();

export async function POST(request: NextRequest) {
  try {
    const { userId, score, gameMode, opponentName, opponentScore, isWinner, duration } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const matchData = {
      user_id: userId,
      score: score || 0,
      game_mode: gameMode || 'multiplayer',
      opponent_name: opponentName || 'Unknown',
      opponent_score: opponentScore || 0,
      is_winner: isWinner || false,
      duration: duration || 0,
      correct_answers: 0, // Can be calculated from score
      total_questions: 0,
      completed_at: new Date().toISOString(),
    };

    // Development mode
    if (isDevMode) {
      const userHistory = devMatchHistory.get(userId) || [];
      const newMatch = {
        id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...matchData,
      };
      userHistory.unshift(newMatch);
      devMatchHistory.set(userId, userHistory);

      return NextResponse.json({ 
        match: newMatch,
        message: 'Match history saved successfully (dev mode)' 
      });
    }

    // Production mode with Supabase using admin client
    const { data: match, error } = await supabaseAdmin
      .from('match_history')
      .insert(matchData)
      .select()
      .single();

    if (error) {
      console.error('Error saving match history:', error);
      return NextResponse.json(
        { error: 'Failed to save match history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      match,
      message: 'Match history saved successfully' 
    });
  } catch (error) {
    console.error('Error in save match history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export devMatchHistory for other routes to access
export function getDevMatchHistory() {
  return devMatchHistory;
}

