import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Use rpc or raw query via service role
  const results = [];
  
  // Create caddy_tracking
  const { error: e1 } = await supabase.rpc('exec_sql', { sql: '' }).catch(() => ({ error: null }));
  
  // Since we can't run DDL via supabase-js, try direct pg
  // Instead, let's just create via the REST API by trying to insert
  // Actually the service role bypasses RLS, but can't create tables via REST
  
  // Simplest approach: just return the SQL for manual execution
  return new Response(JSON.stringify({ 
    message: "Run this SQL in Supabase SQL Editor",
    sql: `CREATE TABLE IF NOT EXISTS caddy_tracking (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, caddy_user_id text UNIQUE NOT NULL, current_hole integer DEFAULT 1, latitude double precision, longitude double precision, accuracy double precision, is_tracking boolean DEFAULT false, round_start_time timestamptz, updated_at timestamptz DEFAULT now()); ALTER TABLE caddy_tracking ENABLE ROW LEVEL SECURITY; CREATE POLICY "caddy_tracking_all" ON caddy_tracking USING (true) WITH CHECK (true); CREATE TABLE IF NOT EXISTS caddy_completed_rounds (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, caddy_id text NOT NULL, caddy text, date date DEFAULT CURRENT_DATE, start_time timestamptz, end_time timestamptz, total_time text, holes_completed integer DEFAULT 18, created_at timestamptz DEFAULT now()); ALTER TABLE caddy_completed_rounds ENABLE ROW LEVEL SECURITY; CREATE POLICY "caddy_rounds_all" ON caddy_completed_rounds USING (true) WITH CHECK (true);`
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
