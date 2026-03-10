import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth';

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

    await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', payload.session_id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
  }
}
