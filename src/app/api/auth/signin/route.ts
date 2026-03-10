import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: user } = await supabase
      .from('app_users')
      .select('id, username, password_hash, role')
      .eq('username', username)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    // Record login event in user_sessions
    let sessionId: string | undefined;
    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
          user_agent: request.headers.get('user-agent') ?? null,
        } as Record<string, unknown>)
        .select('id')
        .single();
      sessionId = (session as { id: string } | null)?.id;
    } catch {
      // Session tracking is non-critical — login should not fail
    }

    const token = await createSessionToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      session_id: sessionId,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
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
