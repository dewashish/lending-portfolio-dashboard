import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';

const CRO_USERNAME = 'Sudhir Sagar';
const CRO_ROLE = 'cro';

/** Constant-time string comparison using Web Crypto HMAC */
async function tokensMatch(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw', encoder.encode('key'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const [sigA, sigB] = await Promise.all([
    globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  let diff = 0;
  for (let i = 0; i < viewA.length; i++) diff |= viewA[i] ^ viewB[i];
  return diff === 0;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const expectedToken = process.env.MAGIC_LINK_TOKEN_CRO;
  const loginUrl = new URL('/login', request.url);

  if (!token || !expectedToken || !(await tokensMatch(token, expectedToken))) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Look up or create the CRO user
    let { data: user } = await supabase
      .from('app_users')
      .select('id, username, role, email')
      .eq('username', CRO_USERNAME)
      .single();

    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      const { data: newUser, error } = await supabase
        .from('app_users')
        .insert({
          username: CRO_USERNAME,
          password_hash: randomPassword,
          role: CRO_ROLE,
        } as Record<string, unknown>)
        .select('id, username, role, email')
        .single();

      if (error || !newUser) {
        console.error('[magic-link] user creation error:', error);
        return NextResponse.redirect(loginUrl);
      }
      user = newUser;
    }

    // Record session
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
    } catch (e) {
      console.error('[magic-link] session insert error:', e);
    }

    // Create JWT and set cookie
    const jwt = await createSessionToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      email: user.email ?? undefined,
      session_id: sessionId,
    });

    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set(SESSION_COOKIE, jwt, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (e) {
    console.error('[magic-link] unexpected error:', e);
    return NextResponse.redirect(loginUrl);
  }
}
