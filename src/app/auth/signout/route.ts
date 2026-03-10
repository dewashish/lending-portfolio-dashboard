import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Finalize session record before clearing cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const payload = await verifySessionToken(token);
      if (payload?.session_id) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const now = new Date().toISOString();
        await supabase
          .from('user_sessions')
          .update({ signed_out_at: now, last_active_at: now, is_active: false } as Record<string, unknown>)
          .eq('id', payload.session_id);
      }
    } catch {
      // Don't block signout if session finalization fails
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
