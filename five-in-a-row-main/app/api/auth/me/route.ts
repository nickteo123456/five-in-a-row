import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { findUserByEmail } from '@/lib/database';
import { isDevMode } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // In dev mode without Supabase, just return unauthorized
    // The client will handle authentication state differently
    if (isDevMode) {
      return NextResponse.json(
        { error: 'Not authenticated - using development mode' },
        { status: 401 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find user in our custom database using the email from Supabase Auth
    const user = await findUserByEmail(session.user.email!);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
