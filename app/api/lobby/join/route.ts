import { NextRequest, NextResponse } from 'next/server';
import { supabase, isDevMode } from '@/lib/supabase';
import { getDevLobbies } from '../create/route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { lobbyCode, userId, userName } = await request.json();

    if (!lobbyCode || !userId || !userName) {
      return NextResponse.json(
        { error: 'Lobby code, user ID, and name are required' },
        { status: 400 }
      );
    }

    // Development mode
    if (isDevMode) {
      const devLobbies = getDevLobbies();
      const lobby = devLobbies.get(lobbyCode);

      if (!lobby) {
        return NextResponse.json(
          { error: 'Lobby not found' },
          { status: 404 }
        );
      }

      if (lobby.status !== 'waiting') {
        return NextResponse.json(
          { error: 'Lobby is not available' },
          { status: 400 }
        );
      }

      if (lobby.guest_user_id) {
        return NextResponse.json(
          { error: 'Lobby is full' },
          { status: 400 }
        );
      }

      if (lobby.host_user_id === userId) {
        return NextResponse.json(
          { error: 'You cannot join your own lobby' },
          { status: 400 }
        );
      }

      // Join the lobby
      lobby.guest_user_id = userId;
      lobby.guest_name = userName;
      lobby.status = 'ready'; // Both players present, waiting for host to start
      lobby.updated_at = new Date().toISOString();

      devLobbies.set(lobbyCode, lobby);

      return NextResponse.json({ 
        lobby,
        message: 'Joined lobby successfully (dev mode)' 
      });
    }

    // Production mode with Supabase
    // Check if lobby exists and is available
    const { data: lobby, error: fetchError } = await supabase
      .from('game_lobbies')
      .select('*, users!game_lobbies_host_user_id_fkey(name)')
      .eq('lobby_code', lobbyCode)
      .eq('status', 'waiting')
      .single();

    if (fetchError || !lobby) {
      console.error('Error fetching lobby:', fetchError);
      return NextResponse.json(
        { error: 'Lobby not found or not available' },
        { status: 404 }
      );
    }

    if (lobby.guest_user_id) {
      return NextResponse.json(
        { error: 'Lobby is full' },
        { status: 400 }
      );
    }

    if (lobby.host_user_id === userId) {
      return NextResponse.json(
        { error: 'You cannot join your own lobby' },
        { status: 400 }
      );
    }

    // Get guest user name
    const { data: guestData, error: guestError } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (guestError) {
      console.error('Error fetching guest user:', guestError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Join the lobby
    const { data: updatedLobby, error: updateError } = await supabase
      .from('game_lobbies')
      .update({
        guest_user_id: userId,
        guest_name: guestData.name,
        status: 'ready', // Both players present, waiting for host to start
      })
      .eq('id', lobby.id)
      .select('*, users!game_lobbies_host_user_id_fkey(name)')
      .single();

    if (updateError) {
      console.error('Error joining lobby:', updateError);
      return NextResponse.json(
        { error: 'Failed to join lobby' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      lobby: {
        ...updatedLobby,
        host_name: lobby.users.name,
        guest_name: guestData.name,
      },
      message: 'Joined lobby successfully' 
    });
  } catch (error) {
    console.error('Error in join lobby:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

