import { NextResponse } from 'next/server';
import { loadDataFromDisk } from '@/lib/data-loader';
import { isDataLoaded } from '@/lib/store';

export async function GET() {
  try {
    // Auto-load from data/ folder if not loaded yet
    if (!isDataLoaded()) {
      loadDataFromDisk();
    }

    const data = loadDataFromDisk();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}
