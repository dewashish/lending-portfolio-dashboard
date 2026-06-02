import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'session';

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function strToBase64url(s: string): string {
  return bytesToBase64url(new TextEncoder().encode(s));
}

// Auto-provision a default Super Admin session for this instance (no login required).
async function signDefaultSession(): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'fallback-dev-secret';
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: '00000000-0000-0000-0000-000000000001',
    username: 'Sudhir',
    role: 'super_admin',
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  };
  const data = `${strToBase64url(JSON.stringify(header))}.${strToBase64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${bytesToBase64url(new Uint8Array(sigBuf))}`;
}

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
  const path = request.nextUrl.pathname;

  // No valid session → auto-provision a Super Admin session (Sudhir) and land on the dashboard.
  if (!isValid) {
    const newToken = await signDefaultSession();
    let response: NextResponse;
    if (path === '/' || path.startsWith('/login')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      response = NextResponse.redirect(url);
    } else {
      response = NextResponse.next();
    }
    response.cookies.set(SESSION_COOKIE, newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  // Authenticated users on / or /login → redirect to /dashboard
  if (path === '/' || path.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
