import { NextRequest, NextResponse } from 'next/server';
import { supabase, isDevMode } from '@/lib/supabase';
import { getDevLobbies } from '../create/route';

export const dynamic = 'force-dynamic';

// GET - Fetch lobby details
export async function GET(
  request: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  try {
    const { lobbyId } = params;
    console.log('[GET /api/lobby] Searching for lobby:', lobbyId);

    // Development mode
    if (isDevMode) {
      const devLobbies = getDevLobbies();
      
      // Find lobby by ID or code
      let lobby = null;
      for (const [code, l] of devLobbies.entries()) {
        if (l.id === lobbyId || l.lobby_code === lobbyId) {
          lobby = l;
          break;
        }
      }

      if (!lobby) {
        return NextResponse.json(
          { error: 'Lobby not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ lobby });
    }

    // Production mode with Supabase
    // Try searching by lobby_code first (more common for joining)
    console.log('[GET /api/lobby] Querying by code:', lobbyId);
    let { data: lobby, error } = await supabase
      .from('game_lobbies')
      .select(`
        *,
        host:users!game_lobbies_host_user_id_fkey(id, name, email),
        guest:users!game_lobbies_guest_user_id_fkey(id, name, email)
      `)
      .eq('lobby_code', lobbyId)
      .maybeSingle();

    // If not found by code, try by ID
    if (!lobby && !error) {
      console.log('[GET /api/lobby] Not found by code, trying by ID');
      const result = await supabase
        .from('game_lobbies')
        .select(`
          *,
          host:users!game_lobbies_host_user_id_fkey(id, name, email),
          guest:users!game_lobbies_guest_user_id_fkey(id, name, email)
        `)
        .eq('id', lobbyId)
        .maybeSingle();
      
      lobby = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[GET /api/lobby] Database error:', error);
    }

    if (!lobby) {
      console.error('[GET /api/lobby] Lobby not found in database for:', lobbyId);
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    console.log('[GET /api/lobby] Found lobby:', lobby.id, 'Status:', lobby.status);

    return NextResponse.json({ 
      lobby: {
        ...lobby,
        host_name: lobby.host?.name,
        guest_name: lobby.guest?.name,
      }
    });
  } catch (error) {
    console.error('Error in get lobby:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update lobby state (for game moves, scores, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  try {
    const { lobbyId } = params;
    const updates = await request.json();

    // Development mode
    if (isDevMode) {
      const devLobbies = getDevLobbies();
      
      let lobby = null;
      let lobbyCode = '';
      for (const [code, l] of devLobbies.entries()) {
        if (l.id === lobbyId || l.lobby_code === lobbyId) {
          lobby = l;
          lobbyCode = code;
          break;
        }
      }

      if (!lobby) {
        return NextResponse.json(
          { error: 'Lobby not found' },
          { status: 404 }
        );
      }

      // Update lobby
      Object.assign(lobby, updates, { updated_at: new Date().toISOString() });
      devLobbies.set(lobbyCode, lobby);

      return NextResponse.json({ 
        lobby,
        message: 'Lobby updated successfully (dev mode)' 
      });
    }

    // Production mode with Supabase
    const { data: lobby, error } = await supabase
      .from('game_lobbies')
      .update(updates)
      .or(`id.eq.${lobbyId},lobby_code.eq.${lobbyId}`)
      .select(`
        *,
        host:users!game_lobbies_host_user_id_fkey(id, name, email),
        guest:users!game_lobbies_guest_user_id_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating lobby:', error);
      return NextResponse.json(
        { error: 'Failed to update lobby' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      lobby: {
        ...lobby,
        host_name: lobby.host?.name,
        guest_name: lobby.guest?.name,
      },
      message: 'Lobby updated successfully' 
    });
  } catch (error) {
    console.error('Error in update lobby:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Leave/Cancel lobby
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  try {
    const { lobbyId } = params;
    const { userId } = await request.json();

    // Development mode
    if (isDevMode) {
      const devLobbies = getDevLobbies();
      
      let lobby = null;
      let lobbyCode = '';
      for (const [code, l] of devLobbies.entries()) {
        if (l.id === lobbyId || l.lobby_code === lobbyId) {
          lobby = l;
          lobbyCode = code;
          break;
        }
      }

      if (!lobby) {
        return NextResponse.json(
          { error: 'Lobby not found' },
          { status: 404 }
        );
      }

      // If host leaves, delete lobby immediately to free up the code
      if (lobby.host_user_id === userId) {
        devLobbies.delete(lobbyCode);
        return NextResponse.json({ message: 'Lobby deleted successfully (dev mode)' });
      }

      // If guest leaves, just remove them
      if (lobby.guest_user_id === userId) {
        lobby.guest_user_id = null;
        lobby.guest_name = null;
        lobby.status = 'waiting';
        lobby.updated_at = new Date().toISOString();
        devLobbies.set(lobbyCode, lobby);
        return NextResponse.json({ message: 'Left lobby successfully (dev mode)' });
      }

      return NextResponse.json(
        { error: 'You are not a member of this lobby' },
        { status: 403 }
      );
    }

    // Production mode with Supabase
    const { data: lobby, error: fetchError } = await supabase
      .from('game_lobbies')
      .select('*')
      .or(`id.eq.${lobbyId},lobby_code.eq.${lobbyId}`)
      .single();

    if (fetchError || !lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    // If host leaves, delete the lobby immediately to free up the code
    if (lobby.host_user_id === userId) {
      const { error: deleteError } = await supabase
        .from('game_lobbies')
        .delete()
        .eq('id', lobby.id);

      if (deleteError) {
        console.error('Error deleting lobby:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete lobby' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Lobby deleted successfully' });
    }

    // If guest leaves, just remove them
    if (lobby.guest_user_id === userId) {
      const { error: updateError } = await supabase
        .from('game_lobbies')
        .update({
          guest_user_id: null,
          status: 'waiting',
        })
        .eq('id', lobby.id);

      if (updateError) {
        console.error('Error leaving lobby:', updateError);
        return NextResponse.json(
          { error: 'Failed to leave lobby' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Left lobby successfully' });
    }

    return NextResponse.json(
      { error: 'You are not a member of this lobby' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error in delete lobby:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

