import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isDevMode } from '@/lib/supabase'
import { devStore } from '@/lib/dev-store'
import { requireRole } from '@/lib/session'
import { parseBody, questionQuerySchema, questionSchema } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = questionQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!query.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    const { count } = query.data
    const random = query.data.random === 'true'

    if (isDevMode) {
      const questions = Array.from(devStore.questions.values()).filter((q) => q.is_active)

      if (random && count) {
        const shuffled = questions.sort(() => 0.5 - Math.random())
        return NextResponse.json({
          questions: shuffled.slice(0, count),
        })
      }

      return NextResponse.json({ questions })
    }

    const activeQuestions = supabaseAdmin.from('questions').select('*').eq('is_active', true)

    if (random && count) {
      const { data: allQuestions, error } = await activeQuestions

      if (error) {
        logger.error('Error fetching questions:', error)
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
      }

      const shuffled = (allQuestions || []).sort(() => 0.5 - Math.random())
      return NextResponse.json({
        questions: shuffled.slice(0, count),
      })
    }

    const { data: questions, error } = await activeQuestions.order('created_at', {
      ascending: false,
    })

    if (error) {
      logger.error('Error fetching questions:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch (error) {
    logger.error('Error in get questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('teacher')
    if (session instanceof NextResponse) return session

    const body = await parseBody(request, questionSchema)
    if (body instanceof NextResponse) return body

    if (isDevMode) {
      const newQuestion = {
        id: `question-${Date.now()}`,
        ...body,
        created_by: session.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      }

      devStore.questions.set(newQuestion.id, newQuestion)
      return NextResponse.json({
        question: newQuestion,
        message: 'Question created (dev mode)',
      })
    }

    const { data: newQuestion, error } = await supabaseAdmin
      .from('questions')
      .insert({ ...body, created_by: session.userId })
      .select()
      .single()

    if (error) {
      logger.error('Error creating question:', error)
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
    }

    return NextResponse.json({
      question: newQuestion,
      message: 'Question created successfully',
    })
  } catch (error) {
    logger.error('Error in create question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
