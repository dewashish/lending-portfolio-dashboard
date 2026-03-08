import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
