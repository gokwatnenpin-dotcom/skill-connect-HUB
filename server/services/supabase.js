import { createClient } from '@supabase/supabase-js';

const client = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

export async function getSupabaseUser(accessToken) {
  if (!client) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error) throw error;
  return data.user;
}
