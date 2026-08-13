import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-Client für Client Components.
 *
 * NEXT_PUBLIC_SUPABASE_URL muss die reine Basis-URL sein, OHNE
 * /rest/v1/-Suffix (z. B. https://xxxxx.supabase.co) — ein
 * angehängtes Suffix in den Vercel-Env-Vars führt zu fehlschlagenden
 * Requests, die schwer zu diagnostizieren sind.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
