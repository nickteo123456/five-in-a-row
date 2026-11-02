import { NextRequest, NextResponse } from 'next/server';
import { supabase, isDevMode } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// In-memory lobby store for development mode
const devLobbies = new Map<string, any>();

function generateLobbyCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { userId, userName } = await request.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'User ID and name are required' },
        { status: 400 }
      );
    }

    // Development mode
    if (isDevMode) {
      let lobbyCode = generateLobbyCode();
      
      // Ensure unique code in dev mode
      while (devLobbies.has(lobbyCode)) {
        lobbyCode = generateLobbyCode();
      }

      const lobby = {
        id: `lobby-${Date.now()}`,
        lobby_code: lobbyCode,
        host_user_id: userId,
        host_name: userName,
        guest_user_id: null,
        guest_name: null,
        status: 'waiting',
        current_turn: 'X',
        board_state: Array(15).fill(null).map(() => Array(15).fill(null)),
        host_score: 0,
        guest_score: 0,
        current_question_index: 0,
        host_can_place: false,
        guest_can_place: false,
        winner_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      devLobbies.set(lobbyCode, lobby);

      return NextResponse.json({ 
        lobby,
        message: 'Lobby created successfully (dev mode)' 
      });
    }

    // Production mode with Supabase
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_lobby_code');

    if (codeError) {
      console.error('Error generating lobby code:', codeError);
      return NextResponse.json(
        { error: 'Failed to generate lobby code' },
        { status: 500 }
      );
    }

    const lobbyCode = codeData;

    // Get user name from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create the lobby
    const { data: lobby, error: lobbyError } = await supabase
      .from('game_lobbies')
      .insert({
        lobby_code: lobbyCode,
        host_user_id: userId,
        host_name: userData.name,
        status: 'waiting',
        current_turn: 'X',
        host_score: 0,
        guest_score: 0,
        current_question_index: 0,
        host_can_place: false,
        guest_can_place: false,
      })
      .select()
      .single();

    if (lobbyError) {
      console.error('Error creating lobby:', lobbyError);
      return NextResponse.json(
        { error: 'Failed to create lobby' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      lobby: {
        ...lobby,
        host_name: userData.name,
      },
      message: 'Lobby created successfully' 
    });
  } catch (error) {
    console.error('Error in create lobby:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export dev lobbies for other routes to access
export function getDevLobbies() {
  return devLobbies;
}

