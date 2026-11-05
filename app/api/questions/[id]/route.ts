import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { devStore } from '@/lib/dev-store'
import { requireRole } from '@/lib/session'
import { parseBody, questionUpdateSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// PUT - Update question
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    const body = await parseBody(request, questionUpdateSchema)
    if (body instanceof NextResponse) return body

    const { id } = await params

    // Development mode
    if (isDevMode) {
      const devQuestions = devStore.questions
      const question = devQuestions.get(id)

      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }

      const updated = {
        ...question,
        ...body,
        updated_at: new Date().toISOString(),
      }

      devQuestions.set(id, updated)
      return NextResponse.json({ question: updated, message: 'Question updated (dev mode)' })
    }

    // Production mode with Supabase
    const { data: updatedQuestion, error } = await supabaseAdmin
      .from('questions')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating question:', error)
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }

    return NextResponse.json({
      question: updatedQuestion,
      message: 'Question updated successfully',
    })
  } catch (error) {
    logger.error('Error in update question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete question (soft delete by setting is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    const { id } = await params

    // Development mode
    if (isDevMode) {
      const devQuestions = devStore.questions
      const question = devQuestions.get(id)

      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }

      question.is_active = false
      devQuestions.set(id, question)
      return NextResponse.json({ message: 'Question deleted (dev mode)' })
    }

    // Production mode with Supabase - soft delete
    const { error } = await supabaseAdmin
      .from('questions')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      logger.error('Error deleting question:', error)
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Question deleted successfully' })
  } catch (error) {
    logger.error('Error in delete question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
