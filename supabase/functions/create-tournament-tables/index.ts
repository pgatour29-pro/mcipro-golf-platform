import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL")!;
  
  // Use pg module to connect directly
  const { Pool } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  const pool = new Pool(SUPABASE_DB_URL, 1);
  const conn = await pool.connect();
  
  try {
    // Create tournaments table
    await conn.queryArray(`
      CREATE TABLE IF NOT EXISTS public.tournaments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        society_id UUID, name TEXT NOT NULL, description TEXT,
        organizer_id TEXT NOT NULL, organizer_name TEXT,
        num_days INTEGER NOT NULL CHECK (num_days BETWEEN 2 AND 4),
        scoring_format TEXT NOT NULL DEFAULT 'stableford',
        status TEXT NOT NULL DEFAULT 'upcoming',
        cut_enabled BOOLEAN DEFAULT false, cut_after_day INTEGER,
        cut_type TEXT, cut_value INTEGER,
        entry_fee INTEGER DEFAULT 0, max_participants INTEGER,
        registration_deadline DATE, is_private BOOLEAN DEFAULT false,
        creator_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create tournament_days table
    await conn.queryArray(`
      CREATE TABLE IF NOT EXISTS public.tournament_days (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 4),
        event_id TEXT NOT NULL, course_name TEXT, event_date DATE,
        tee_marker TEXT DEFAULT 'white',
        status TEXT DEFAULT 'upcoming',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tournament_id, day_number), UNIQUE(tournament_id, event_id)
      );
    `);

    // Create tournament_registrations table
    await conn.queryArray(`
      CREATE TABLE IF NOT EXISTS public.tournament_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL, player_name TEXT NOT NULL,
        handicap REAL, playing_handicap REAL,
        status TEXT DEFAULT 'registered',
        cut_after_day INTEGER, paid BOOLEAN DEFAULT false, payment_method TEXT,
        registered_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tournament_id, player_id)
      );
    `);

    // Enable RLS
    await conn.queryArray(`ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;`);
    await conn.queryArray(`ALTER TABLE public.tournament_days ENABLE ROW LEVEL SECURITY;`);
    await conn.queryArray(`ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;`);

    // Create RLS policies (use DO block to handle if exists)
    const policies = [
      `DO $$ BEGIN CREATE POLICY "tournaments_select" ON public.tournaments FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "tournaments_insert" ON public.tournaments FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "tournaments_update" ON public.tournaments FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "td_select" ON public.tournament_days FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "td_insert" ON public.tournament_days FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "td_update" ON public.tournament_days FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "td_delete" ON public.tournament_days FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "tr_select" ON public.tournament_registrations FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "tr_insert" ON public.tournament_registrations FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "tr_update" ON public.tournament_registrations FOR UPDATE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      `DO $$ BEGIN CREATE POLICY "tr_delete" ON public.tournament_registrations FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    ];
    for (const p of policies) await conn.queryArray(p);

    return new Response(JSON.stringify({ success: true, message: "Tournament tables created!" }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    conn.release();
    await pool.end();
  }
});
