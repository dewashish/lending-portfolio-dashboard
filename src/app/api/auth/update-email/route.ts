import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Get current session
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await supabase
      .from('app_users')
      .update({ email } as Record<string, unknown>)
      .eq('id', session.sub);

    if (error) {
      console.error('[update-email] DB error:', error);
      return NextResponse.json({ error: 'Failed to update email.' }, { status: 500 });
    }

    // Re-issue JWT with email included
    const newToken = await createSessionToken({
      sub: session.sub,
      username: session.username,
      role: session.role,
      email,
      session_id: session.session_id,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
