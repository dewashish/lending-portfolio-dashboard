import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const adminPin = process.env.ADMIN_PIN;

    if (!adminPin) {
      return NextResponse.json(
        { valid: false, error: 'Admin PIN not configured. Set ADMIN_PIN in environment variables.' },
        { status: 500 },
      );
    }

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const valid = pin === adminPin;
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
  }
}
