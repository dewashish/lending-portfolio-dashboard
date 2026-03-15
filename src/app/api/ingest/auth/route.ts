import { NextResponse } from 'next/server';
import { hashApiKey } from '@/lib/ingestion/auth';
import { supabaseService } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const { api_key } = await request.json();

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ error: 'api_key is required' }, { status: 400 });
    }

    const keyHash = hashApiKey(api_key);

    const { data: keyRow, error } = await supabaseService
      .from('api_keys')
      .select('id, subsidiary_id, scopes, is_active, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyRow) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (!keyRow.is_active) {
      return NextResponse.json({ error: 'API key is deactivated' }, { status: 403 });
    }

    if (new Date(keyRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 403 });
    }

    // Update last_used_at
    await supabaseService
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id);

    return NextResponse.json({
      subsidiary_id: keyRow.subsidiary_id,
      scopes: keyRow.scopes,
      message: 'API key is valid. Use it in the Authorization: Bearer <key> or X-API-Key header for ingestion endpoints.',
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
