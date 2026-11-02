import { NextResponse } from 'next/server';
import { supabaseAdmin, isDevMode } from '@/lib/supabase';
import { getAllDevUsers } from '@/lib/dev-users';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[Teacher Students API] Starting request...');
    console.log('[Teacher Students API] isDevMode:', isDevMode);
    
    // In dev mode, return dev users
    if (isDevMode) {
      const users = getAllDevUsers();
      const students = users.filter(u => u.role === 'student').map(student => ({
        ...student,
        user_id: student.id,
        total_matches: 0,
        highest_score: 0,
        average_score: 0,
        total_correct: 0,
        total_questions_attempted: 0,
        overall_accuracy: 0,
        last_activity: null,
      }));
      
      console.log('[Teacher Students API] Returning dev students:', students.length);
      return NextResponse.json({ students });
    }

    // Get all students from users table with their stats using admin client (bypasses RLS)
    console.log('[Teacher Students API] Querying Supabase for students...');
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, created_at, total_score, highest_score, matches_played, wins, losses')
      .eq('role', 'student')
      .order('created_at', { ascending: false });
    
    console.log('[Teacher Students API] Supabase response - data:', usersData?.length, 'error:', usersError);

    if (usersError) {
      console.error('[Teacher Students API] Error fetching students with stats:', usersError);
      
      // If columns don't exist, try fetching without stats columns
      console.log('[Teacher Students API] Trying fallback - fetching without stats columns...');
      const { data: basicUsersData, error: basicError } = await supabaseAdmin
        .from('users')
        .select('id, name, email, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      
      console.log('[Teacher Students API] Fallback response - data:', basicUsersData?.length, 'error:', basicError);
      
      if (basicError) {
        console.error('[Teacher Students API] Error fetching basic student data:', basicError);
        return NextResponse.json(
          { error: 'Failed to fetch students', details: basicError.message },
          { status: 500 }
        );
      }
      
      // Return students with zero stats
      const students = (basicUsersData || []).map(user => ({
        user_id: user.id,
        name: user.name,
        email: user.email,
        total_matches: 0,
        highest_score: 0,
        average_score: 0,
        total_correct: 0,
        total_questions_attempted: 0,
        overall_accuracy: 0,
        last_activity: null,
        created_at: user.created_at,
      }));
      
      console.log('[Teacher Students API] Returning fallback students:', students.length);
      return NextResponse.json({ 
        students,
        warning: 'Stats columns not found. Please run add-user-stats-columns.sql migration.'
      });
    }
    
    if (!usersData || usersData.length === 0) {
      console.log('[Teacher Students API] No students found in database');
      return NextResponse.json({ students: [] });
    }

    // Map students data directly from users table (no match_history needed)
    const students = usersData.map((user) => {
      const totalMatches = user.matches_played || 0;
      const highestScore = user.highest_score || 0;
      const totalScore = user.total_score || 0;
      const averageScore = totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0;
      const wins = user.wins || 0;
      const losses = user.losses || 0;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return {
        user_id: user.id,
        name: user.name,
        email: user.email,
        total_matches: totalMatches,
        highest_score: highestScore,
        average_score: averageScore,
        total_correct: 0,
        total_questions_attempted: 0,
        overall_accuracy: winRate,
        last_activity: null,
        created_at: user.created_at,
      };
    });

    // Sort by highest score descending
    students.sort((a, b) => b.highest_score - a.highest_score);

    console.log('[Teacher Students API] Returning students:', students.length);
    return NextResponse.json({ students });
  } catch (error) {
    console.error('[Teacher Students API] Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

