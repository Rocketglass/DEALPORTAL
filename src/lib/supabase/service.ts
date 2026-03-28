import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Create a Supabase client using the service role key.
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * in trusted server-side contexts (e.g., invitation acceptance, admin operations).
 *
 * Never expose this client or its key to the browser.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase service client not configured — SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
