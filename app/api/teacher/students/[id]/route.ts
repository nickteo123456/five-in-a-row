import { NextRequest, NextResponse } from 'next/server';
import { supabase, isDevMode } from '@/lib/supabase';
import { deleteDevUser, findDevUserByEmail, getAllDevUsers } from '@/lib/dev-users';

export const dynamic = 'force-dynamic';

// DELETE /api/teacher/students/[id] - Delete a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // In dev mode, delete from dev users
    if (isDevMode) {
      const success = deleteDevUser(id);
      if (!success) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ message: 'Student deleted successfully' });
    }

    // Check if user exists and is a student
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'student') {
      return NextResponse.json(
        { error: 'Cannot delete non-student accounts' },
        { status: 403 }
      );
    }

    // Delete the student (cascade will handle match_history)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting student:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete student' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

