import { createClient } from '@supabase/supabase-js';

// Service-role client for data ingestion — server-side only
// Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
// NEVER import this in client components
export const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
