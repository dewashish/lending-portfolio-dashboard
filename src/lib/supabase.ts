import { createClient } from '@supabase/supabase-js';

// Singleton for data queries — uses @supabase/supabase-js directly (not @supabase/ssr)
// The SSR-aware client from @supabase/ssr is used only for auth operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
