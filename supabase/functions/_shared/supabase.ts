import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Service-role client: bypasses RLS so it can perform the deletes that RLS now
// denies to anon. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected
// into every Edge Function by Supabase — you do NOT set these manually.
//
// IMPORTANT: only ever construct this server-side (here, inside the function).
// The service-role key must never reach the browser.
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
