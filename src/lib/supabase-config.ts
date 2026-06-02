// Public Supabase connection config for the Baobab instance.
// NEXT_PUBLIC_SUPABASE_ANON_KEY is a publishable key (ships in the browser bundle
// and is protected by RLS), so it is safe to embed as a fallback. Environment
// variables take precedence when present; the fallback keeps the deployed
// instance working even when build-time env vars are missing or empty.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wnkrllrureljmezcoryf.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jkaOQHaE3D4Dhvp_Vb1qgg_4RXXWSPb';
