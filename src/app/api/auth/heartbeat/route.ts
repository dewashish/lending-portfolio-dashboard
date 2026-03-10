import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

/** If last_active_at is older than this, treat it as a return visit */
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes (2× heartbeat interval)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload?.session_id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check if the current session is stale (user left and came back)
    const { data: currentSession } = await supabase
      .from('user_sessions')
      .select('last_active_at')
      .eq('id', payload.session_id)
      .single();

    const now = new Date();
    const lastActive = currentSession
      ? new Date((currentSession as { last_active_at: string }).last_active_at)
      : null;
    const isStale = lastActive && (now.getTime() - lastActive.getTime()) > STALE_THRESHOLD_MS;

    if (isStale) {
      // Mark old session as inactive
      await supabase
        .from('user_sessions')
        .update({ is_active: false } as Record<string, unknown>)
        .eq('id', payload.session_id);

      // Create a new session for this return visit
      let newSessionId = payload.session_id; // fallback
      try {
        const { data: newSession } = await supabase
          .from('user_sessions')
          .insert({
            user_id: payload.sub,
            ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
            user_agent: request.headers.get('user-agent') ?? null,
          } as Record<string, unknown>)
          .select('id')
          .single();
        if (newSession) {
          newSessionId = (newSession as { id: string }).id;
        }
      } catch {
        // If new session creation fails, continue with old session_id
      }

      // Issue a new JWT with the new session_id
      const newToken = await createSessionToken({
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
        session_id: newSessionId,
      });

      const response = NextResponse.json({ ok: true, renewed: true });
      response.cookies.set(SESSION_COOKIE, newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    // Normal heartbeat — just update last_active_at
    await supabase
      .from('user_sessions')
      .update({ last_active_at: now.toISOString() } as Record<string, unknown>)
      .eq('id', payload.session_id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
  }
}
