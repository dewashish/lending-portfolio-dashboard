import { createHash } from 'crypto';
import { supabaseService } from '../supabase/service';
import type { IngestionAuthContext } from '../types';

/**
 * Hash an API key using SHA-256 for comparison with stored hashes.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Validate an API key from the request and return the auth context.
 * Extracts the key from the Authorization header (Bearer <key>) or X-API-Key header.
 */
export async function authenticateIngestion(
  request: Request
): Promise<{ ok: true; context: IngestionAuthContext } | { ok: false; error: string; status: number }> {
  // Extract key from headers
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  let rawKey: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    rawKey = apiKeyHeader;
  }

  if (!rawKey) {
    return { ok: false, error: 'Missing API key. Provide via Authorization: Bearer <key> or X-API-Key header.', status: 401 };
  }

  const keyHash = hashApiKey(rawKey);

  // Look up the key
  const { data: keyRow, error } = await supabaseService
    .from('api_keys')
    .select('id, subsidiary_id, scopes, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !keyRow) {
    return { ok: false, error: 'Invalid API key.', status: 401 };
  }

  if (!keyRow.is_active) {
    return { ok: false, error: 'API key is deactivated.', status: 403 };
  }

  if (new Date(keyRow.expires_at) < new Date()) {
    return { ok: false, error: 'API key has expired.', status: 403 };
  }

  // Update last_used_at
  await supabaseService
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id);

  // Fetch subsidiary info for currency
  const { data: sub } = await supabaseService
    .from('subsidiaries')
    .select('currency_code, is_active')
    .eq('id', keyRow.subsidiary_id)
    .single();

  if (!sub || !sub.is_active) {
    return { ok: false, error: `Subsidiary ${keyRow.subsidiary_id} not found or inactive.`, status: 403 };
  }

  return {
    ok: true,
    context: {
      subsidiaryId: keyRow.subsidiary_id,
      currencyCode: sub.currency_code,
      scopes: keyRow.scopes || ['ingest'],
    },
  };
}

/**
 * Verify that the submitted subsidiary_id matches the API key's scope.
 */
export function verifySubsidiaryScope(
  context: IngestionAuthContext,
  submittedSubsidiaryId: number
): string | null {
  if (context.subsidiaryId !== submittedSubsidiaryId) {
    return `API key not authorized for subsidiary ${submittedSubsidiaryId}. Key is scoped to subsidiary ${context.subsidiaryId}.`;
  }
  return null;
}
