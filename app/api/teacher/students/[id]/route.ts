import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { deleteDevUser, findDevUserById } from '@/lib/dev-users'
import { requireRole } from '@/lib/session'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// DELETE /api/teacher/students/[id] - Delete a student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    const { id } = await params

    // In dev mode, delete from dev users
    if (isDevMode) {
      const student = findDevUserById(id)
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      if (student.role !== 'student') {
        return NextResponse.json({ error: 'Cannot delete non-student accounts' }, { status: 403 })
      }
      deleteDevUser(id)
      return NextResponse.json({ message: 'Student deleted successfully' })
    }

    // Check if user exists and is a student
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Cannot delete non-student accounts' }, { status: 403 })
    }

    // Delete the student (cascade will handle match_history)
    const { error: deleteError } = await supabaseAdmin.from('users').delete().eq('id', id)

    if (deleteError) {
      logger.error('Error deleting student:', deleteError)
      return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    logger.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
