import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Elevated DB client for server-side work (the deletes RLS denies to clients).
//
// SEALED NOTE: prefer the new SECRET API key (sb_secret_...) once you migrate.
// After you REVOKE the legacy JWT secret, the legacy service_role key stops
// working (it is an HS256 JWT signed by that secret) — APP_DB_SECRET must be
// set by then. During transition it falls back to the auto-injected key.
export function serviceClient(): SupabaseClient {
  const key =
    Deno.env.get("APP_DB_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(Deno.env.get("SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
