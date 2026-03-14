import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Generic type will be added once we run `supabase gen types typescript`
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
