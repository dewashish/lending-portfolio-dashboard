import { NextResponse } from 'next/server';
import { loadDataFromDisk } from '@/lib/data-loader';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  try {
    const data = loadDataFromDisk(force);
    return NextResponse.json({
      success: true,
      info: data.datasetInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
