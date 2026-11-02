import { NextResponse } from 'next/server';
import { supabaseAdmin, isDevMode } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // In dev mode, return empty history
    if (isDevMode) {
      return NextResponse.json({ matches: [] });
    }

    // Get match history from match_history table using admin client
    const { data: matches, error: matchError } = await supabaseAdmin
      .from('match_history')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(100); // Get last 100 matches

    // If match_history table doesn't exist yet, return empty array
    if (matchError) {
      console.log('Match history table error or not found:', matchError.code, matchError.message);
      return NextResponse.json({ matches: [] });
    }

    // Get student info for each match using admin client
    const matchesWithStudents = await Promise.all(
      (matches || []).map(async (match) => {
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('name, email')
          .eq('id', match.user_id)
          .maybeSingle();

        return {
          id: match.id,
          user_id: match.user_id,
          student_name: user?.name || 'Unknown',
          student_email: user?.email || 'N/A',
          score: match.score,
          correct_answers: match.correct_answers,
          total_questions: match.total_questions,
          game_mode: match.game_mode,
          duration: match.duration,
          completed_at: match.completed_at,
          opponent_name: match.opponent_name || 'Unknown',
          opponent_score: match.opponent_score || 0,
          is_winner: match.is_winner || false,
        };
      })
    );

    return NextResponse.json({ matches: matchesWithStudents });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

