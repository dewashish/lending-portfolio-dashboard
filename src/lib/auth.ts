import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'session';

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'fallback-dev-secret';
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;       // user id
  username: string;
  role: string;
  email?: string;
  session_id?: string;  // links to user_sessions.id
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      role: payload.role as string,
      email: (payload.email as string) ?? undefined,
      session_id: (payload.session_id as string) ?? undefined,
    };
  } catch {
    return null;
  }
}
