import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';

// Singleton for data queries — uses @supabase/supabase-js directly (not @supabase/ssr)
// The SSR-aware client from @supabase/ssr is used only for auth operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
