import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'session';

async function verifyJWT(token: string): Promise<boolean> {
  try {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'fallback-dev-secret';
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode base64url signature
    const sig = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return false;

    // Check expiration
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isValid = token ? await verifyJWT(token) : false;

  // Unauthenticated users trying to access protected routes → redirect to /login
  if (
    !isValid &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated users on /login → redirect to /dashboard
  if (isValid && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
