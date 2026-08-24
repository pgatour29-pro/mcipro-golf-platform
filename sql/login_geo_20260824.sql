-- Login geography capture (2026-08-24)
-- One row per login session: IP-derived geo (from /api/geo Vercel headers) always,
-- GPS-derived city/country only when the browser permission was ALREADY granted
-- (never prompts). Precise coordinates are intentionally NOT stored - city level only.
-- Table is INSERT-only for the anon key: no SELECT/UPDATE/DELETE policies on purpose,
-- so browsers can write but never read anyone's location history. Reports run
-- server-side (supabase db query / future admin RPC).

CREATE TABLE IF NOT EXISTS login_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    line_user_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    ip text,
    ip_country text,
    ip_region text,
    ip_city text,
    ip_timezone text,
    browser_timezone text,
    browser_language text,
    gps_country text,
    gps_country_code text,
    gps_region text,
    gps_city text,
    user_agent text
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_time ON login_events (line_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_time ON login_events (created_at DESC);

ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS login_events_insert ON login_events;
CREATE POLICY login_events_insert ON login_events
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- First-capture geography stamped once per member ("where did this member register from").
-- Written when NULL; upgraded in place if the first stamp was IP-based and GPS arrives later.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS registration_geo jsonb;
