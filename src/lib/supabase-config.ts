// Public Supabase connection config for the Baobab instance.
// NEXT_PUBLIC_SUPABASE_ANON_KEY is a publishable key (ships in the browser bundle
// and is protected by RLS), so it is safe to embed directly.
//
// These are authoritative for this preview branch and intentionally do NOT read
// from env: the deployment was receiving stale/incorrect Vercel env values that
// overrode the correct connection, leaving the dashboard without data. Hardcoding
// the known-good values makes the data connection deterministic regardless of the
// Vercel environment configuration.
export const SUPABASE_URL = 'https://wnkrllrureljmezcoryf.supabase.co';

export const SUPABASE_ANON_KEY = 'sb_publishable_jkaOQHaE3D4Dhvp_Vb1qgg_4RXXWSPb';
